/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */

import {
  getChangeData,
  toChange,
  isAdditionOrModificationChange,
  isFieldChange,
  isModificationChange,
  ObjectType,
  AdditionChange,
  Field,
  ModificationChange,
  Change,
} from '@salto-io/adapter-api'
import _ from 'lodash'
import { getReferencedElements } from '../reference_dependencies'
import { LocalFilterCreator } from '../filter'
import { DEFAULT_DEPLOY_REFERENCED_ELEMENTS } from '../config/constants'
import { isStandardInstanceOrCustomRecordType } from '../types'

const getFieldParentChanges = (
  fieldChanges: (AdditionChange<Field> | ModificationChange<Field>)[],
  sdfChanges: Change[],
): ModificationChange<ObjectType>[] => {
  const elemIdSet = new Set(sdfChanges.map(getChangeData).map(elem => elem.elemID.getFullName()))
  const afterFieldsByParent = _.groupBy(
    fieldChanges.map(change => change.data.after),
    field => field.parent.elemID.getFullName(),
  )
  const beforeFieldsByParent = _.groupBy(
    fieldChanges.filter(isModificationChange).map(change => change.data.before),
    field => field.parent.elemID.getFullName(),
  )
  return Object.entries(afterFieldsByParent)
    .filter(([parent]) => !elemIdSet.has(parent))
    .map(([parent, afterFields]) => {
      const afterParent = afterFields[0].parent
      if (beforeFieldsByParent[parent] !== undefined) {
        const beforeParent = beforeFieldsByParent[parent][0].parent
        return {
          action: 'modify',
          data: { before: beforeParent, after: afterParent },
        }
      }
      const beforeParent = afterParent.clone()
      // all field changes of this parent are additions
      afterFields.forEach(field => {
        delete beforeParent.fields[field.name]
      })
      return {
        action: 'modify',
        data: { before: beforeParent, after: afterParent },
      }
    })
}

const filterCreator: LocalFilterCreator = ({ config }) => ({
  name: 'additionalChanges',
  preDeploy: async changes => {
    const sdfChanges = changes
      // SDF objects deletions are handled by SOAP
      .filter(isAdditionOrModificationChange)
      .filter(change => isStandardInstanceOrCustomRecordType(change.data.after))

    const [fieldChanges, typesAndInstancesChanges] = _.partition(sdfChanges, isFieldChange)
    const fieldParentChanges = getFieldParentChanges(fieldChanges, sdfChanges)

    const requiredElements = (
      await getReferencedElements(
        typesAndInstancesChanges.concat(fieldParentChanges).map(change => change.data.after),
        config.deploy?.deployReferencedElements ?? DEFAULT_DEPLOY_REFERENCED_ELEMENTS,
      )
    ).map(elem => elem.clone())

    const additionalChanges = requiredElements
      .map(elem => toChange({ before: elem, after: elem }))
      .concat(fieldParentChanges)

    changes.push(...additionalChanges)
  },
})

export default filterCreator
