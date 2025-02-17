/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import { ElemID, Field, InstanceElement, ObjectType, toChange } from '@salto-io/adapter-api'
import { workflowType } from '../../src/autogen/types/standard_types/workflow'
import { entitycustomfieldType } from '../../src/autogen/types/standard_types/entitycustomfield'
import removeSdfElementsValidator from '../../src/change_validators/remove_sdf_elements'
import { CUSTOM_RECORD_TYPE, INTERNAL_ID, IS_LOCKED, METADATA_TYPE, NETSUITE } from '../../src/constants'
import { mockChangeValidatorParams } from '../utils'

describe('remove sdf object change validator', () => {
  const customRecordType = new ObjectType({
    elemID: new ElemID(NETSUITE, 'customrecord1'),
    annotations: { [METADATA_TYPE]: CUSTOM_RECORD_TYPE, [INTERNAL_ID]: '1' },
  })
  const lockedCustomRecordType = new ObjectType({
    elemID: new ElemID(NETSUITE, 'customrecord1_locked'),
    annotations: { [METADATA_TYPE]: CUSTOM_RECORD_TYPE, [INTERNAL_ID]: '1', [IS_LOCKED]: true },
  })
  const customRecordTypeInstance = new InstanceElement('test', customRecordType)

  describe('remove instance of standard type', () => {
    it('should have change error when removing an instance of an unsupported standard type', async () => {
      const standardInstanceNoInternalId = new InstanceElement('test', workflowType().type)

      const changeErrors = await removeSdfElementsValidator(
        [toChange({ before: standardInstanceNoInternalId })],
        mockChangeValidatorParams(),
      )
      expect(changeErrors).toHaveLength(1)
      expect(changeErrors[0].severity).toEqual('Error')
      expect(changeErrors[0].elemID).toEqual(standardInstanceNoInternalId.elemID)
      expect(changeErrors[0].message).toEqual("Can't remove instance")
    })

    it('should have change error when removing an instance of standard type with no internal id', async () => {
      const standardInstanceNoInternalId = new InstanceElement('test', entitycustomfieldType().type)

      const changeErrors = await removeSdfElementsValidator(
        [toChange({ before: standardInstanceNoInternalId })],
        mockChangeValidatorParams(),
      )
      expect(changeErrors).toHaveLength(1)
      expect(changeErrors[0].severity).toEqual('Error')
      expect(changeErrors[0].elemID).toEqual(standardInstanceNoInternalId.elemID)
      expect(changeErrors[0].message).toEqual("Can't remove instance")
    })

    it('should not have change error when removing an instance of standard type with internal id', async () => {
      const standardInstance = new InstanceElement('test', entitycustomfieldType().type, { [INTERNAL_ID]: '11' })

      const changeErrors = await removeSdfElementsValidator(
        [toChange({ before: standardInstance })],
        mockChangeValidatorParams(),
      )
      expect(changeErrors).toHaveLength(0)
    })
  })

  describe('remove instance of custom record type', () => {
    it('should not have change error when removing an instance with non standard type', async () => {
      const changeErrors = await removeSdfElementsValidator(
        [toChange({ before: customRecordTypeInstance })],
        mockChangeValidatorParams(),
      )
      expect(changeErrors).toHaveLength(0)
    })
  })

  describe('remove custom record type', () => {
    it('should have change error when removing a custom record type with no internal id', async () => {
      const customRecordTypeNoInternalID = new ObjectType({
        elemID: new ElemID(NETSUITE, 'customrecord2'),
        annotations: { [METADATA_TYPE]: CUSTOM_RECORD_TYPE },
      })

      const changeErrors = await removeSdfElementsValidator(
        [toChange({ before: customRecordTypeNoInternalID })],
        mockChangeValidatorParams(),
      )
      expect(changeErrors).toHaveLength(1)
      expect(changeErrors[0].severity).toEqual('Error')
      expect(changeErrors[0].elemID).toEqual(customRecordTypeNoInternalID.elemID)
    })

    it('should have change warning when removing a custom record type with internal id', async () => {
      const instanceOfAnotherType = new InstanceElement(
        'test',
        new ObjectType({
          elemID: new ElemID(NETSUITE, 'another_customrecord1'),
          annotations: { [METADATA_TYPE]: CUSTOM_RECORD_TYPE, [INTERNAL_ID]: '1' },
        }),
      )

      const changeErrors = await removeSdfElementsValidator(
        [toChange({ before: customRecordType }), toChange({ before: instanceOfAnotherType })],
        mockChangeValidatorParams(),
      )
      expect(changeErrors).toHaveLength(1)
      expect(changeErrors[0].severity).toEqual('Warning')
      expect(changeErrors[0].elemID).toEqual(customRecordType.elemID)
    })

    it('should not have change warning when removing a locked custom record type', async () => {
      const changeErrors = await removeSdfElementsValidator(
        [toChange({ before: lockedCustomRecordType })],
        mockChangeValidatorParams(),
      )
      expect(changeErrors).toHaveLength(0)
    })

    it('should have change error when removing a custom record type with internal id when instances exists in the index', async () => {
      const changeErrors = await removeSdfElementsValidator(
        [toChange({ before: customRecordType })],
        mockChangeValidatorParams(),
      )
      expect(changeErrors).toHaveLength(1)
      expect(changeErrors[0].severity).toEqual('Warning')
      expect(changeErrors[0].elemID).toEqual(customRecordType.elemID)
    })
  })

  describe('remove fields', () => {
    const field = new Field(customRecordType, 'internalId', customRecordType)

    it('should have change error on the field when removing a field without its custom record type', async () => {
      const anotherCustomRecordType = new ObjectType({
        elemID: new ElemID(NETSUITE, 'another_customrecord1'),
        annotations: { [METADATA_TYPE]: CUSTOM_RECORD_TYPE, [INTERNAL_ID]: '1' },
      })

      const changeErrors = await removeSdfElementsValidator(
        [toChange({ before: field }), toChange({ before: anotherCustomRecordType })],
        mockChangeValidatorParams(),
      )
      expect(changeErrors).toHaveLength(2)
      expect(changeErrors[0].severity).toEqual('Error')
      expect(changeErrors[0].elemID).toEqual(field.elemID)
      expect(changeErrors[1].severity).toEqual('Warning')
      expect(changeErrors[1].elemID).toEqual(anotherCustomRecordType.elemID)
    })

    it('should have change warning on the custom record type when removing a field with its custom record type', async () => {
      const changeErrors = await removeSdfElementsValidator(
        [toChange({ before: field }), toChange({ before: customRecordType })],
        mockChangeValidatorParams(),
      )
      expect(changeErrors).toHaveLength(1)
      expect(changeErrors[0].severity).toEqual('Warning')
      expect(changeErrors[0].elemID).toEqual(customRecordType.elemID)
    })
  })
})
