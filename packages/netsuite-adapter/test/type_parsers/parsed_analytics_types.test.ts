/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */

import { getSubtypes } from '@salto-io/adapter-utils'
import { datasetType } from '../../src/autogen/types/standard_types/dataset'
import { parsedDatasetType } from '../../src/type_parsers/analytics_parsers/parsed_dataset'
import { parsedWorkbookType } from '../../src/type_parsers/analytics_parsers/parsed_workbook'

describe('analytics parsed types tests', () => {
  describe('parsed dataset tests', () => {
    const { type: dataset, innerTypes } = parsedDatasetType()
    it('should have a unique elemID for each inner type', () => {
      const innerTypesSet = new Set<string>()
      const multiUsedElemIds = new Set<string>()
      Object.values(innerTypes).forEach(innerType => {
        const fullName = innerType.elemID.getFullName()
        if (innerTypesSet.has(fullName)) {
          multiUsedElemIds.add(fullName)
        } else {
          innerTypesSet.add(fullName)
        }
      })
      expect(multiUsedElemIds.size).toEqual(0)
    })
    it('should include All used objectTypes in the innerTypes', () => {
      const usedTypes = getSubtypes([dataset])
      const innerTypesNames = new Set<string>(
        Object.values(innerTypes).map(innerType => innerType.elemID.getFullName()),
      )
      expect(usedTypes.length).toEqual(innerTypesNames.size)
      const typesNotFoundInInnerTypes = usedTypes.filter(
        usedType => !innerTypesNames.has(usedType.elemID.getFullName()),
      )
      expect(typesNotFoundInInnerTypes.length).toEqual(0)
    })
    it('should include all of the fields of the original type in the new type', () => {
      const newFields = new Set<string>(Object.keys(dataset))
      const unusedFields = Object.keys(datasetType().type).filter(fieldName => !newFields.has(fieldName))
      expect(unusedFields.length).toEqual(0)
    })
  })
  describe('parsed workbook tests', () => {
    const { type: workbook, innerTypes } = parsedWorkbookType()
    it('should have a unique elemID for each inner type', () => {
      const innerTypesSet = new Set<string>()
      const multiUsedElemIds = new Set<string>()
      Object.values(innerTypes).forEach(innerType => {
        const fullName = innerType.elemID.getFullName()
        if (innerTypesSet.has(fullName)) {
          multiUsedElemIds.add(fullName)
        } else {
          innerTypesSet.add(fullName)
        }
      })
      expect(multiUsedElemIds.size).toEqual(0)
    })
    it('should include All used objectTypes in the innerTypes', async () => {
      const usedTypes = new Set<string>(getSubtypes([workbook]).map(elem => elem.elemID.getFullName()))
      const innerTypesNames = new Set<string>(
        Object.values(innerTypes).map(innerType => innerType.elemID.getFullName()),
      )
      const typesNotFoundInInnerTypes = [...usedTypes].filter(usedType => !innerTypesNames.has(usedType))
      const typesNotFoundInUsedTypes = [...innerTypesNames].filter(innerType => !usedTypes.has(innerType))
      expect(typesNotFoundInInnerTypes.length).toEqual(0)
      expect(typesNotFoundInUsedTypes.length).toEqual(0)
    })
    it('should include all of the fields of the original type in the new type', () => {
      const newFields = new Set<string>(Object.keys(workbook))
      const unusedFields = Object.keys(datasetType().type).filter(fieldName => !newFields.has(fieldName))
      expect(unusedFields.length).toEqual(0)
    })
  })
})
