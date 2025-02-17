/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import { MockInterface, mockFunction } from '@salto-io/test-utils'
import { queryWithDefault } from '../../../src/definitions'
import { getRequester } from '../../../src/fetch/request/requester'
import { noPagination } from '../../../src/fetch/request/pagination'
import { HTTPReadClientInterface, HTTPWriteClientInterface } from '../../../src/client'
import { FetchRequestDefinition } from '../../../src/definitions/system/fetch'

describe('requester', () => {
  // TODO extend tests
  describe('getRequester', () => {
    const client: MockInterface<HTTPReadClientInterface & HTTPWriteClientInterface> = {
      get: mockFunction<(HTTPReadClientInterface & HTTPWriteClientInterface)['get']>(),
      put: mockFunction<(HTTPReadClientInterface & HTTPWriteClientInterface)['put']>(),
      patch: mockFunction<(HTTPReadClientInterface & HTTPWriteClientInterface)['patch']>(),
      post: mockFunction<(HTTPReadClientInterface & HTTPWriteClientInterface)['post']>(),
      delete: mockFunction<(HTTPReadClientInterface & HTTPWriteClientInterface)['delete']>(),
      head: mockFunction<(HTTPReadClientInterface & HTTPWriteClientInterface)['head']>(),
      options: mockFunction<(HTTPReadClientInterface & HTTPWriteClientInterface)['options']>(),
      getPageSize: mockFunction<(HTTPReadClientInterface & HTTPWriteClientInterface)['getPageSize']>(),
    }
    beforeEach(() => {
      client.get.mockReset()
      client.post.mockReset()
      client.get
        .mockResolvedValueOnce(
          Promise.resolve({
            data: {
              a: 'a',
            },
            status: 200,
            statusText: 'OK',
          }),
        )
        .mockResolvedValueOnce(
          Promise.resolve({
            data: {
              a: 'a',
            },
            status: 200,
            statusText: 'OK',
          }),
        )
        .mockResolvedValueOnce(
          Promise.resolve({
            data: {
              b: 'b',
            },
            status: 200,
            statusText: 'OK',
          }),
        )
    })
    it('should make requests and extract items based on definitions', async () => {
      const requester = getRequester({
        adapterName: 'a',
        clients: {
          default: 'main',
          options: {
            main: {
              httpClient: client,
              endpoints: {
                default: {
                  get: {
                    readonly: true,
                  },
                },
                customizations: {},
              },
            },
          },
        },
        pagination: {
          none: {
            funcCreator: noPagination,
          },
        },
        requestDefQuery: queryWithDefault<FetchRequestDefinition<'main'>[], string>({
          customizations: {
            myType: [{ endpoint: { path: '/ep' } }, { endpoint: { path: '/ep2' } }],
          },
        }),
      })
      expect(
        await requester.request({ typeName: 'myType', contexts: [], requestDef: { endpoint: { path: '/ep' } } }),
      ).toEqual([
        {
          typeName: 'myType',
          context: {},
          value: { a: 'a' },
        },
      ])
      expect(
        await requester.requestAllForResource({ callerIdentifier: { typeName: 'myType' }, contextPossibleArgs: {} }),
      ).toEqual([
        {
          typeName: 'myType',
          context: {},
          value: { a: 'a' },
        },
        {
          typeName: 'myType',
          context: {},
          value: { b: 'b' },
        },
      ])
    })
    it('should use context in url', async () => {
      const requester = getRequester({
        adapterName: 'a',
        clients: {
          default: 'main',
          options: {
            main: {
              httpClient: client,
              endpoints: {
                default: {
                  get: {
                    readonly: true,
                  },
                },
                customizations: {},
              },
            },
          },
        },
        pagination: {
          none: {
            funcCreator: noPagination,
          },
        },
        requestDefQuery: queryWithDefault<FetchRequestDefinition<'main'>[], string>({
          customizations: {
            typeWithContext: [
              {
                endpoint: { path: '/custom/{arg1}/{customArg2}' },
                context: {
                  arg1: 'a1',
                  custom: args => () => ({
                    ...args,
                    customArg2: 'a2',
                  }),
                },
              },
            ],
          },
        }),
      })
      await requester.requestAllForResource({
        callerIdentifier: { typeName: 'typeWithContext' },
        contextPossibleArgs: {},
      })
      expect(client.get.mock.calls[0][0]).toEqual({
        url: '/custom/a1/a2',
      })
    })
    it('should fail if endpoint is not marked as read-only', async () => {
      const requester = getRequester({
        adapterName: 'a',
        clients: {
          default: 'main',
          options: {
            main: {
              httpClient: client,
              endpoints: {
                customizations: {},
              },
            },
          },
        },
        pagination: {
          none: {
            funcCreator: noPagination,
          },
        },
        requestDefQuery: queryWithDefault<FetchRequestDefinition<'main'>[], string>({
          customizations: {
            myType: [{ endpoint: { path: '/ep' } }],
          },
        }),
      })
      await expect(() =>
        requester.request({ typeName: 'myType', contexts: [], requestDef: { endpoint: { path: '/ep' } } }),
      ).rejects.toThrow('Endpoint [main]/ep:undefined is not marked as readonly, cannot use in fetch')
      await expect(() =>
        requester.requestAllForResource({ callerIdentifier: { typeName: 'myType' }, contextPossibleArgs: {} }),
      ).rejects.toThrow('Endpoint [main]/ep:undefined is not marked as readonly, cannot use in fetch')
    })
  })
})
