/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import { ElemID, InstanceElement, ObjectType, toChange } from '@salto-io/adapter-api'
import { elementSource } from '@salto-io/workspace'
import { ZENDESK, ARTICLE_TYPE_NAME } from '../../src/constants'
import { usersValidator } from '../../src/change_validators'
import ZendeskClient from '../../src/client/client'
import { ZendeskFetchConfig } from '../../src/user_config'

const { createInMemoryElementSource } = elementSource

describe('usersValidator', () => {
  let client: ZendeskClient
  let mockGet: jest.SpyInstance
  let config: ZendeskFetchConfig

  const articleType = new ObjectType({
    elemID: new ElemID(ZENDESK, ARTICLE_TYPE_NAME),
  })
  const macroType = new ObjectType({
    elemID: new ElemID(ZENDESK, 'macro'),
  })
  const customRoleType = new ObjectType({
    elemID: new ElemID(ZENDESK, 'custom_role'),
  })

  const articleInstance = new InstanceElement('article', articleType, { author_id: 'article@salto.com', draft: false })
  const macroInstance = new InstanceElement('macro', macroType, {
    actions: [
      {
        field: 'assignee_id',
        value: 'thisuserismissing@salto.com',
      },
      {
        field: 'requester_id',
        value: '1@salto.io',
      },
    ],
    restriction: {
      type: 'User',
      id: 'thisuserismissing2@salto.com',
    },
  })

  const permissionsCustomRole = new InstanceElement('permissions_custom_role', customRoleType, {
    id: 1,
    configuration: {
      ticket_editing: true,
    },
  })

  const noPermissionsCustomRole = new InstanceElement('no_permissions_custom_role', customRoleType, {
    id: 2,
    configuration: {
      ticket_editing: false,
    },
  })

  const testsElementSource = createInMemoryElementSource([permissionsCustomRole, noPermissionsCustomRole])
  beforeEach(async () => {
    config = { resolveUserIDs: true } as ZendeskFetchConfig
  })
  beforeAll(async () => {
    client = new ZendeskClient({
      credentials: { username: 'a', password: 'b', subdomain: 'ignore' },
    })
    mockGet = jest.spyOn(client, 'get')
    mockGet.mockImplementation(() => ({
      status: 200,
      data: {
        users: [
          { id: 1, email: '1@salto.io', name: '1', role: 'agent', custom_role_id: 1, locale: 'en-US' },
          { id: 2, email: '2@salto.io', name: '2', role: 'agent', custom_role_id: 1, locale: 'en-US' },
          { id: 3, email: '3@salto.io', name: '3', role: 'admin', custom_role_id: 1, locale: 'en-US' },
          { id: 4, email: '4@salto.io', name: '4', role: 'agent', custom_role_id: 1, locale: 'en-US' },
          { id: 5, email: '5@salto.io', name: '5', role: 'agent', custom_role_id: 1, locale: 'en-US' },
          { id: 6, email: '6@salto.io', name: '6', role: 'agent', custom_role_id: 2, locale: 'en-US' },
          { id: 7, email: '7@salto.io', name: '7', role: 'agent', custom_role_id: 2, locale: 'en-US' },
        ],
      },
    }))
  })

  it('should return errors if users are missing and there is no deploy config', async () => {
    const changes = [toChange({ after: articleInstance }), toChange({ after: macroInstance })]
    const changeValidator = usersValidator(client, config)
    const errors = await changeValidator(changes, testsElementSource)
    expect(errors).toHaveLength(2)
    expect(errors).toEqual([
      {
        elemID: articleInstance.elemID,
        severity: 'Error',
        message: "Instance references users which don't exist in target environment",
        detailedMessage:
          "The following users are referenced by this instance, but do not exist in the target environment: article@salto.com.\nIn order to deploy this instance, add these users to your target environment, edit this instance to use valid usernames, or set the target environment's user fallback options.\nLearn more: https://help.salto.io/en/articles/6955302-element-references-users-which-don-t-exist-in-target-environment-zendesk",
      },
      {
        elemID: macroInstance.elemID,
        severity: 'Error',
        message: "Instance references users which don't exist in target environment",
        detailedMessage:
          "The following users are referenced by this instance, but do not exist in the target environment: thisuserismissing@salto.com, thisuserismissing2@salto.com.\nIn order to deploy this instance, add these users to your target environment, edit this instance to use valid usernames, or set the target environment's user fallback options.\nLearn more: https://help.salto.io/en/articles/6955302-element-references-users-which-don-t-exist-in-target-environment-zendesk",
      },
    ])
  })
  it('should not return errors if resolveUserIDs is false', async () => {
    config = { resolveUserIDs: false } as ZendeskFetchConfig
    const changes = [toChange({ after: articleInstance }), toChange({ after: macroInstance })]
    const changeValidator = usersValidator(client, config)
    const errors = await changeValidator(changes, testsElementSource)
    expect(errors).toHaveLength(0)
  })
  it('should not return an error if user exists', async () => {
    const articleWithValidUser = new InstanceElement('article', articleType, { author_id: '1@salto.io', draft: false })
    const changes = [toChange({ after: articleWithValidUser })]
    const changeValidator = usersValidator(client, config)
    const errors = await changeValidator(changes, testsElementSource)
    expect(errors).toHaveLength(0)
  })
  it('should not return an error if user values are valid', async () => {
    const macroWithValidUserFields = new InstanceElement('macro', macroType, {
      actions: [
        {
          field: 'assignee_id',
          value: 'current_user',
        },
        {
          field: 'requester_id',
          value: 'requester_id',
        },
      ],
    })
    const triggerInstance = new InstanceElement('trigger', new ObjectType({ elemID: new ElemID(ZENDESK, 'trigger') }), {
      conditions: {
        all: [
          {
            field: 'assignee_id',
            operator: 'is',
            value: '',
          },
          {
            field: 'role',
            operator: 'is',
            value: 'end_user',
          },
        ],
      },
    })
    const changes = [toChange({ after: macroWithValidUserFields }), toChange({ after: triggerInstance })]
    const changeValidator = usersValidator(client, config)
    const errors = await changeValidator(changes, testsElementSource)
    expect(errors).toHaveLength(0)
  })

  it('should warn if the user does not have the right permissions for its field', async () => {
    const triggerInstance = new InstanceElement('trigger', new ObjectType({ elemID: new ElemID(ZENDESK, 'trigger') }), {
      conditions: {
        all: [
          {
            field: 'assignee_id',
            operator: 'is',
            value: '6@salto.io',
          },
          {
            field: 'assignee_id',
            operator: 'is',
            value: '7@salto.io',
          },
          {
            field: 'requester_id',
            operator: 'is',
            value: '6@salto.io',
          },
          {
            field: 'requester_id',
            operator: 'is',
            value: '7@salto.io',
          },
        ],
      },
    })
    const triggerInstance2 = new InstanceElement(
      'trigger2',
      new ObjectType({ elemID: new ElemID(ZENDESK, 'trigger') }),
      {
        conditions: {
          all: [
            {
              field: 'assignee_id',
              operator: 'is',
              value: '6@salto.io',
            },
            {
              field: 'assignee_id',
              operator: 'is',
              value: '7@salto.io',
            },
            {
              field: 'requester_id',
              operator: 'is',
              value: '6@salto.io',
            },
            {
              field: 'requester_id',
              operator: 'is',
              value: '7@salto.io',
            },
          ],
        },
      },
    )
    const changes = [toChange({ after: triggerInstance }), toChange({ after: triggerInstance2 })]
    const changeValidator = usersValidator(client, config)
    const errors = await changeValidator(changes, testsElementSource)
    expect(errors).toMatchObject([
      {
        elemID: triggerInstance.elemID,
        severity: 'Warning',
        message: 'Some users do not have the required permissions to be set as assignees',
        detailedMessage:
          "The users 6@salto.io, 7@salto.io cannot be set as assignees because they don't have the ticket editing permission.",
      },
      {
        elemID: triggerInstance2.elemID,
        severity: 'Warning',
        message: 'Some users do not have the required permissions to be set as assignees',
        detailedMessage:
          "The users 6@salto.io, 7@salto.io cannot be set as assignees because they don't have the ticket editing permission.",
      },
    ])
  })
})
