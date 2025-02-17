/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import { ObjectType, BuiltinTypes, MapType, ListType } from '@salto-io/adapter-api'
import { createRequestConfigs, validateRequestConfig } from '../../src/config_deprecated'
import { getConfigTypeName } from '../../src/config_deprecated/request'

describe('config_request', () => {
  describe('createRequestConfigs', () => {
    it('should return default config type when no custom fields were added', async () => {
      const {
        fetch: { request, requestDefault },
      } = createRequestConfigs({ adapter: 'myAdapter' })
      expect(Object.keys(request.fields)).toHaveLength(6)
      expect(Object.keys(request.fields).sort()).toEqual([
        'dependsOn',
        'paginationField',
        'queryParams',
        'recurseInto',
        'recursiveQueryByResponseField',
        'url',
      ])
      expect(request.fields.url.refType.elemID.isEqual(BuiltinTypes.STRING.elemID)).toBeTruthy()
      expect(request.fields.paginationField.refType.elemID.isEqual(BuiltinTypes.STRING.elemID)).toBeTruthy()
      const dependsOnType = (await request.fields.dependsOn.getType()) as ListType
      expect(dependsOnType).toBeInstanceOf(ListType)
      const dependsOnTypeInner = (await dependsOnType.getInnerType()) as ObjectType
      expect(dependsOnTypeInner).toBeInstanceOf(ObjectType)
      expect(Object.keys(dependsOnTypeInner.fields).sort()).toEqual(['from', 'pathParam'])
      const queryParamsType = (await request.fields.queryParams.getType()) as MapType
      expect(queryParamsType).toBeInstanceOf(MapType)
      expect(queryParamsType.refInnerType.elemID.isEqual(BuiltinTypes.STRING.elemID)).toBeTruthy()
      const recursiveQueryByResponseFieldType = (await request.fields.queryParams.getType()) as MapType
      expect(recursiveQueryByResponseFieldType).toBeInstanceOf(MapType)
      expect(recursiveQueryByResponseFieldType.refInnerType.elemID.isEqual(BuiltinTypes.STRING.elemID)).toBeTruthy()

      expect(Object.keys(requestDefault.fields)).toHaveLength(5)
      expect(Object.keys(requestDefault.fields).sort()).toEqual([
        'dependsOn',
        'paginationField',
        'queryParams',
        'recurseInto',
        'recursiveQueryByResponseField',
      ])
      expect(requestDefault.fields.paginationField.refType.elemID.isEqual(BuiltinTypes.STRING.elemID)).toBeTruthy()
      const dependsOnDefaultType = (await requestDefault.fields.dependsOn.getType()) as ListType
      expect(dependsOnDefaultType).toBeInstanceOf(ListType)
      const dependsOnDefaultTypeInner = (await dependsOnType.getInnerType()) as ObjectType
      expect(dependsOnDefaultTypeInner).toBeInstanceOf(ObjectType)
      expect(Object.keys(dependsOnDefaultTypeInner.fields).sort()).toEqual(['from', 'pathParam'])
      const queryParamsDefaultType = (await requestDefault.fields.queryParams.getType()) as MapType
      expect(queryParamsDefaultType).toBeInstanceOf(MapType)
      expect(queryParamsDefaultType.refInnerType.elemID.isEqual(BuiltinTypes.STRING.elemID)).toBeTruthy()
      const recursiveQueryByResponseFieldDefaultType = (await requestDefault.fields.queryParams.getType()) as MapType
      expect(recursiveQueryByResponseFieldDefaultType).toBeInstanceOf(MapType)
      expect(
        recursiveQueryByResponseFieldDefaultType.refInnerType.elemID.isEqual(BuiltinTypes.STRING.elemID),
      ).toBeTruthy()
    })

    it('should include additional fields when added', () => {
      const {
        fetch: { request, requestDefault },
      } = createRequestConfigs({
        adapter: 'myAdapter',
        additionalFields: { a: { refType: BuiltinTypes.STRING } },
      })
      expect(Object.keys(request.fields)).toHaveLength(7)
      expect(Object.keys(request.fields).sort()).toEqual([
        'a',
        'dependsOn',
        'paginationField',
        'queryParams',
        'recurseInto',
        'recursiveQueryByResponseField',
        'url',
      ])
      expect(request.fields.a.refType.elemID.isEqual(BuiltinTypes.STRING.elemID)).toBeTruthy()
      expect(Object.keys(requestDefault.fields)).toHaveLength(6)
      expect(Object.keys(requestDefault.fields).sort()).toEqual([
        'a',
        'dependsOn',
        'paginationField',
        'queryParams',
        'recurseInto',
        'recursiveQueryByResponseField',
      ])
      expect(requestDefault.fields.a.refType.elemID.isEqual(BuiltinTypes.STRING.elemID)).toBeTruthy()
    })

    it('should include additional actions when added', () => {
      const { deployRequests } = createRequestConfigs({
        adapter: 'myAdapter',
        additionalActions: ['a', 'b'],
      })
      expect(Object.keys(deployRequests.fields)).toHaveLength(5)
      expect(Object.keys(deployRequests.fields).sort()).toEqual(['a', 'add', 'b', 'modify', 'remove'])
      expect(deployRequests.fields.a.refType.elemID).toEqual(deployRequests.fields.add.refType.elemID)
      expect(deployRequests.fields.b.refType.elemID).toEqual(deployRequests.fields.add.refType.elemID)
    })
  })

  describe('validateRequestConfig', () => {
    it('should validate successfully when values are valid', () => {
      expect(() =>
        validateRequestConfig(
          'PATH',
          {
            dependsOn: [{ pathParam: 'abc', from: { field: 'field', type: 'type' } }],
          },
          {
            t1: {
              url: '/a/b',
              dependsOn: [
                { pathParam: 'abc', from: { field: 'field', type: 'type' } },
                { pathParam: 'def', from: { field: 'field', type: 'type' } },
              ],
            },
            t2: {
              url: '/a/b',
              dependsOn: [
                { pathParam: 'abc', from: { field: 'field', type: 'type' } },
                { pathParam: 'def', from: { field: 'field', type: 'type' } },
              ],
            },
          },
        ),
      ).not.toThrow()
    })
    it('should fail if there are conflicts between dependsOn entries in the default config', () => {
      expect(() =>
        validateRequestConfig(
          'PATH',
          {
            dependsOn: [
              { pathParam: 'abc', from: { field: 'field', type: 'type' } },
              { pathParam: 'abc', from: { field: 'f1', type: 't2' } },
            ],
          },
          {
            t1: {
              url: '/a/b',
              dependsOn: [{ pathParam: 'abc', from: { field: 'field', type: 'type' } }],
            },
            t2: {
              url: '/a/b',
              dependsOn: [
                { pathParam: 'abc', from: { field: 'field', type: 'type' } },
                { pathParam: 'def', from: { field: 'field', type: 'type' } },
              ],
            },
          },
        ),
      ).toThrow(new Error('Duplicate dependsOn params found in PATH default config: abc'))
    })
    it('should fail if there are conflicts between dependsOn entries for specific types', () => {
      expect(() =>
        validateRequestConfig(
          'PATH',
          {
            dependsOn: [{ pathParam: 'abc', from: { field: 'field', type: 'type' } }],
          },
          {
            t1: {
              url: '/a/b',
              dependsOn: [
                { pathParam: 'abc', from: { field: 'field', type: 'type' } },
                { pathParam: 'abc', from: { field: 'f1', type: 't2' } },
                { pathParam: 'def', from: { field: 'field', type: 'type' } },
              ],
            },
            t2: {
              url: '/a/b',
              dependsOn: [
                { pathParam: 'abc', from: { field: 'field', type: 'type' } },
                { pathParam: 'def', from: { field: 'field', type: 'type' } },
                { pathParam: 'def', from: { field: 'field', type: 'type' } },
              ],
            },
          },
        ),
      ).toThrow(new Error('Duplicate dependsOn params found in PATH for the following types: t1,t2'))
    })
    it('should fail if not all url params can be resolved', () => {
      expect(() =>
        validateRequestConfig(
          'PATH',
          {
            dependsOn: [{ pathParam: 'abc', from: { field: 'field', type: 'type' } }],
          },
          {
            t1: {
              url: '/a/b/{something_missing}',
              dependsOn: [
                { pathParam: 'abc', from: { field: 'field', type: 'type' } },
                { pathParam: 'def', from: { field: 'field', type: 'type' } },
              ],
            },
            t2: {
              url: '/a/{something_else}/b/{abc}/{def}',
              dependsOn: [
                { pathParam: 'abc', from: { field: 'field', type: 'type' } },
                { pathParam: 'def', from: { field: 'field', type: 'type' } },
              ],
            },
            t3: {
              url: '/a/b/{abc}/{def}',
              dependsOn: [
                { pathParam: 'abc', from: { field: 'field', type: 'type' } },
                { pathParam: 'def', from: { field: 'field', type: 'type' } },
              ],
            },
          },
        ),
      ).toThrow(new Error('Unresolved URL params in the following types in PATH for the following types: t1,t2'))
    })
  })
  describe('getConfigTypeName', () => {
    it('should use additional prefix if provided', () => {
      expect(getConfigTypeName('prefix', 'someName')).toEqual('prefix_someName')
    })
    it('should return the typeName if prefix is not provided', () => {
      expect(getConfigTypeName('', 'someName')).toEqual('someName')
    })
  })
})
