/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import _ from 'lodash'
import {
  Change,
  CompareOptions,
  DetailedChange,
  DetailedChangeWithBaseChange,
  Element,
  ElemID,
  getChangeData,
  isElement,
  isEqualElements,
  isEqualValues,
  isField,
  isIndexPathPart,
  isInstanceElement,
  isModificationChange,
  isObjectType,
  isPrimitiveType,
  isRemovalChange,
  isType,
  ObjectType,
  PrimitiveType,
  toChange,
  Value,
} from '@salto-io/adapter-api'
import { getIndependentElemIDs, resolvePath, setPath } from './utils'
import { applyListChanges, getArrayIndexMapping, getChangeRealId, isOrderChange } from './list_comparison'

const compareListWithOrderMatching = ({
  id,
  before,
  after,
  beforeId,
  afterId,
  options,
}: {
  id: ElemID
  before: Value
  after: Value
  beforeId: ElemID | undefined
  afterId: ElemID | undefined
  options: CompareOptions | undefined
}): DetailedChange[] => {
  const indexMapping = getArrayIndexMapping(before, after)

  const itemsChanges = _.flatten(
    indexMapping.map((item, changeIndex) => {
      const itemChangeId = id.createNestedID(changeIndex.toString())
      const itemBeforeId =
        item.beforeIndex !== undefined ? beforeId?.createNestedID(item.beforeIndex.toString()) : undefined
      const itemAfterId =
        item.afterIndex !== undefined ? afterId?.createNestedID(item.afterIndex.toString()) : undefined

      const itemBeforeValue = item.beforeIndex !== undefined ? before[item.beforeIndex] : undefined
      const itemAfterValue = item.afterIndex !== undefined ? after[item.afterIndex] : undefined
      // eslint-disable-next-line no-use-before-define
      const innerChanges = getValuesChanges({
        id: itemChangeId,
        beforeId: itemBeforeId,
        afterId: itemAfterId,
        before: itemBeforeValue,
        after: itemAfterValue,
        options,
      })
      const hasChangeDirectlyOnItem =
        innerChanges.length === 1 && innerChanges.some(change => change.id.isEqual(itemChangeId))
      if (item.beforeIndex !== item.afterIndex && !hasChangeDirectlyOnItem) {
        // This item changed its index, so if we don't already have a change
        // on this item, we need to add one
        innerChanges.push({
          action: 'modify',
          data: {
            before: itemBeforeValue,
            after: itemAfterValue,
          },
          id: itemChangeId,
          elemIDs: { before: itemBeforeId, after: itemAfterId },
        })
      }
      return innerChanges
    }),
  )

  return itemsChanges
}

/**
 * Create detailed changes from change data (before and after values)
 */
export const getValuesChanges = ({
  id,
  before,
  after,
  options,
  beforeId,
  afterId,
}: {
  id: ElemID
  before: Value
  after: Value
  beforeId: ElemID | undefined
  afterId: ElemID | undefined
  options?: CompareOptions
}): DetailedChange[] => {
  if (isElement(before) && isElement(after) && isEqualElements(before, after, options)) {
    return []
  }

  if (!isElement(before) && !isElement(after) && isEqualValues(before, after, options)) {
    return []
  }

  if (before === undefined) {
    return [{ id, action: 'add', data: { after }, elemIDs: { before: beforeId, after: afterId } }]
  }
  if (after === undefined) {
    return [{ id, action: 'remove', data: { before }, elemIDs: { before: beforeId, after: afterId } }]
  }
  if (_.isPlainObject(before) && _.isPlainObject(after)) {
    return _(before)
      .keys()
      .union(_.keys(after))
      .map(key =>
        getValuesChanges({
          id: id.createNestedID(key),
          beforeId: beforeId?.createNestedID(key),
          afterId: afterId?.createNestedID(key),
          before: before[key],
          after: after[key],
          options,
        }),
      )
      .flatten()
      .value()
  }

  if (_.isArray(before) && _.isArray(after)) {
    if (options?.compareListItems) {
      return compareListWithOrderMatching({ id, before, after, beforeId, afterId, options })
    }
    // If compareListItems is false and there is an addition or deletion in the list we treat the whole list as changed
    if (before.length === after.length) {
      return _.flatten(
        _.times(before.length).map(i =>
          getValuesChanges({
            id: id.createNestedID(i.toString()),
            before: before[i],
            after: after[i],
            beforeId: beforeId?.createNestedID(i.toString()),
            afterId: afterId?.createNestedID(i.toString()),
            options,
          }),
        ),
      )
    }
  }
  return [
    {
      id,
      action: 'modify',
      data: { before, after },
      elemIDs: { before: beforeId, after: afterId },
    },
  ]
}

/**
 * Create detailed changes for annotationType, by using elemID.isEqual.
 *
 * We treat change only for annotationType that exist only in one value:
 *   - If the annotation Type exist in before the action will be remove.
 *   - If the annotation Type exist in after the action will be add.
 *
 * Change in the the annotationType value (in the inner annotations or fields) when the
 * annotationType exists in both (before & after) will not consider as change.
 *
 */
const getAnnotationTypeChanges = ({
  id,
  before,
  after,
  beforeId,
  afterId,
}: {
  id: ElemID
  before: Element
  after: Element
  beforeId: ElemID
  afterId: ElemID
}): DetailedChange[] => {
  const hasAnnotationTypes = (elem: Element): elem is ObjectType | PrimitiveType =>
    isObjectType(elem) || isPrimitiveType(elem)

  // Return only annotationTypes that exists in val and not exists in otherVal.
  const returnOnlyAnnotationTypesDiff = (val: Value, otherVal: Value): Value =>
    _.pickBy(
      val.annotationRefTypes,
      (annotationRefType, annotationName) =>
        !otherVal.annotationRefTypes[annotationName]?.elemID.isEqual(annotationRefType.elemID),
    )

  if (hasAnnotationTypes(before) && hasAnnotationTypes(after)) {
    const beforeUniqueAnnotationsTypes = returnOnlyAnnotationTypesDiff(before, after)
    const afterUniqueAnnotationsTypes = returnOnlyAnnotationTypesDiff(after, before)

    // Calling getValuesChanges with unique annotationTypes
    return getValuesChanges({
      id: id.createNestedID('annotation'),
      beforeId: beforeId.createNestedID('annotation'),
      afterId: afterId.createNestedID('annotation'),
      before: beforeUniqueAnnotationsTypes,
      after: afterUniqueAnnotationsTypes,
    })
  }
  return []
}

export const toDetailedChangeFromBaseChange = (
  baseChange: Change<Element>,
  elemIDs?: DetailedChangeWithBaseChange['elemIDs'],
): DetailedChangeWithBaseChange => ({
  ...baseChange,
  id: getChangeData(baseChange).elemID,
  elemIDs,
  baseChange,
})

export const detailedCompare = (
  // This function supports all types of Elements, but doesn't necessarily support Variable (SALTO-4363)
  before: Element,
  after: Element,
  compareOptions?: CompareOptions,
): DetailedChangeWithBaseChange[] => {
  const baseChange = toChange({ before, after })
  const createFieldChanges = compareOptions?.createFieldChanges ?? false

  const getFieldsChanges = (beforeObj: ObjectType, afterObj: ObjectType): DetailedChangeWithBaseChange[] => {
    const removeChanges = Object.keys(beforeObj.fields)
      .filter(fieldName => afterObj.fields[fieldName] === undefined)
      .map(fieldName => beforeObj.fields[fieldName])
      .map(field => toDetailedChangeFromBaseChange(toChange({ before: field }), { before: field.elemID }))

    const addChanges = Object.keys(afterObj.fields)
      .filter(fieldName => beforeObj.fields[fieldName] === undefined)
      .map(fieldName => afterObj.fields[fieldName])
      .map(field => toDetailedChangeFromBaseChange(toChange({ after: field }), { after: field.elemID }))

    const modifyChanges = Object.keys(afterObj.fields)
      .filter(fieldName => beforeObj.fields[fieldName] !== undefined)
      .flatMap(fieldName => detailedCompare(beforeObj.fields[fieldName], afterObj.fields[fieldName], compareOptions))

    return removeChanges.concat(addChanges).concat(modifyChanges)
  }

  // A special case to handle type changes.
  // In fields, we have to modify the whole field.
  // For primitive types, we have to modify the entire type.
  // For object type meta types, we have to modify the entire object.
  if (
    (isField(before) && isField(after) && !before.refType.elemID.isEqual(after.refType.elemID)) ||
    (isPrimitiveType(before) && isPrimitiveType(after) && before.primitive !== after.primitive) ||
    (isObjectType(before) && isObjectType(after) && !before.isMetaTypeEqual(after))
  ) {
    return [toDetailedChangeFromBaseChange(baseChange, { before: before.elemID, after: after.elemID })]
  }

  const valueChanges =
    isInstanceElement(before) && isInstanceElement(after)
      ? getValuesChanges({
          id: after.elemID,
          beforeId: before.elemID,
          afterId: after.elemID,
          before: before.value,
          after: after.value,
          options: compareOptions,
        })
      : []

  // A special case to handle changes in annotationType.
  const annotationTypeChanges = getAnnotationTypeChanges({
    id: after.elemID,
    beforeId: before.elemID,
    afterId: after.elemID,
    before,
    after,
  })

  const afterAttrId = isType(after) ? after.elemID.createNestedID('attr') : after.elemID
  const beforeAttrId = isType(before) ? before.elemID.createNestedID('attr') : before.elemID
  const annotationChanges = getValuesChanges({
    id: afterAttrId,
    beforeId: beforeAttrId,
    afterId: afterAttrId,
    before: before.annotations,
    after: after.annotations,
    options: compareOptions,
  })

  const fieldChanges =
    createFieldChanges && isObjectType(before) && isObjectType(after) ? getFieldsChanges(before, after) : []

  const elementChanges = annotationTypeChanges
    .concat(annotationChanges)
    .concat(valueChanges)
    .map(detailedChange => ({ ...detailedChange, baseChange }))

  return elementChanges.concat(fieldChanges)
}

export const getDetailedChanges = (
  change: Change<Element>,
  compareOptions?: CompareOptions,
): DetailedChangeWithBaseChange[] => {
  if (change.action !== 'modify') {
    return [toDetailedChangeFromBaseChange(change)]
  }
  return detailedCompare(change.data.before, change.data.after, compareOptions)
}

/**
 * When comparing lists with compareListItem, we might get a change about an item
 * in a list that moved from one index to another, and a change about an inner value
 * in that item that was changed. In that case we would want to ignore the inner change
 * since the item change already contains it.
 */
export const getIndependentChanges = (changes: DetailedChange[]): DetailedChange[] => {
  // For performance, avoiding the sort if no need to filter
  if (changes.every(change => !isOrderChange(change))) {
    return changes
  }
  // filter out nested changes if their top level change is already included
  const relevantIds = new Set(getIndependentElemIDs(changes.map(change => change.id)).map(id => id.getFullName()))
  return changes.filter(change => relevantIds.has(change.id.getFullName()))
}

/**
 * Note: When working with list item changes, separating the changes between
 * multiple applyDetailedChanges calls might create different results.
 * E.g., if we have ['a', 'b', 'c'] with a removal change on the index 0 and index 1.
 * if we apply the together we will get ['c'], but if we apply them separately we will get ['b'].
 * So in order to get the expected results, all the detailed changes should be passed to this
 * function in a single call
 */
export const applyDetailedChanges = (
  element: Element,
  detailedChanges: DetailedChange[],
  filterFunc: (change: DetailedChange) => boolean = () => true,
): void => {
  if (detailedChanges.length === 1) {
    const change = detailedChanges[0]
    if (change.id.isEqual(element.elemID) && isModificationChange(change)) {
      element.assign(change.data.after)
      return
    }
  }

  const changesToApply = getIndependentChanges(detailedChanges)
  const [potentialListItemChanges, otherChanges] = _.partition(changesToApply, change =>
    isIndexPathPart(change.id.name),
  )

  const potentialListItemGroups = _.groupBy(potentialListItemChanges, change =>
    change.id.createParentID().getFullName(),
  )

  const [realListItemGroup, otherGroups] = _.partition(Object.values(potentialListItemGroups), group =>
    Array.isArray(resolvePath(element, getChangeRealId(group[0]).createParentID())),
  )

  _(otherChanges)
    .concat(otherGroups.flat())
    .filter(filterFunc)
    .forEach(detailedChange => {
      const id = getChangeRealId(detailedChange)
      const data = isRemovalChange(detailedChange) ? undefined : detailedChange.data.after
      setPath(element, id.replaceParentId(element.elemID), data)
    })

  // we want inner lists to be applied before outer lists, because the indexes may change
  const orderedListItemGroups = _.orderBy(realListItemGroup, group => group[0].id.nestingLevel, 'desc')
  orderedListItemGroups.forEach(changes => {
    applyListChanges(element, changes, filterFunc)
  })
}

export const getRelevantNamesFromChange = (change: Change<Element>): string[] => {
  const element = getChangeData(change)
  const fieldsNames = isObjectType(element) ? element.getFieldsElemIDsFullName() : []
  return [element.elemID.getFullName(), ...fieldsNames]
}
