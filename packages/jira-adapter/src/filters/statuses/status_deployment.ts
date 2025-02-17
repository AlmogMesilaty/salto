/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import {
  CORE_ANNOTATIONS,
  Element,
  isInstanceElement,
  isInstanceChange,
  getChangeData,
  Change,
  InstanceElement,
  isAdditionOrModificationChange,
  isModificationChange,
  AdditionChange,
  ModificationChange,
  Values,
} from '@salto-io/adapter-api'
import { logger } from '@salto-io/logging'
import _ from 'lodash'
import { createSchemeGuard, isResolvedReferenceExpression } from '@salto-io/adapter-utils'
import Joi from 'joi'
import { deployChanges } from '../../deployment/standard_deployment'
import { acquireLockRetry, findObject, setFieldDeploymentAnnotations } from '../../utils'
import { FilterCreator } from '../../filter'
import { STATUS_TYPE_NAME } from '../../constants'
import JiraClient from '../../client/client'

const log = logger(module)
const STATUS_CATEGORY_NAME_TO_ID: Record<string, number> = {
  TODO: 2,
  DONE: 3,
  IN_PROGRESS: 4,
}
const INVERTED_STATUS_CATEGORY_NAME_TO_ID = _.invert(STATUS_CATEGORY_NAME_TO_ID)

type StatusResponse = {
  id: string
  name: string
}[]

const STATUS_RESPONSE_SCHEME = Joi.array().items(
  Joi.object({
    id: Joi.string().required(),
    name: Joi.string().required(),
  })
    .unknown(true)
    .required(),
)

const isStatusResponse = createSchemeGuard<StatusResponse>(
  STATUS_RESPONSE_SCHEME,
  'Received an invalid status addition response',
)

const createDeployableStatusValues = (statusChange: Change<InstanceElement>): Values => {
  const { value } = getChangeData(statusChange)
  const deployableValue = _.clone(value)
  if (isResolvedReferenceExpression(value.statusCategory)) {
    // resolve statusCategory value before deploy
    const resolvedCategory = INVERTED_STATUS_CATEGORY_NAME_TO_ID[value.statusCategory.value.value.id]
    deployableValue.statusCategory = resolvedCategory
  }
  return deployableValue
}

const modifyStatus = async (
  modificationChange: ModificationChange<InstanceElement>,
  client: JiraClient,
): Promise<void> => {
  await acquireLockRetry({
    fn: async () =>
      client.put({
        url: '/rest/api/3/statuses',
        data: {
          statuses: [createDeployableStatusValues(modificationChange)],
        },
      }),
  })
}

const addStatus = async (additionChange: AdditionChange<InstanceElement>, client: JiraClient): Promise<void> => {
  const response = await acquireLockRetry({
    fn: async () =>
      client.post({
        url: '/rest/api/3/statuses',
        data: {
          scope: {
            type: 'GLOBAL',
          },
          statuses: [createDeployableStatusValues(additionChange)],
        },
      }),
  })

  if (!isStatusResponse(response.data)) {
    throw new Error(
      `Received an invalid status response when attempting to create status: ${additionChange.data.after.elemID.getFullName()}`,
    )
  }
  getChangeData(additionChange).value.id = response.data[0].id
}

const deployStatus = async (
  change: AdditionChange<InstanceElement> | ModificationChange<InstanceElement>,
  client: JiraClient,
): Promise<void> => {
  if (isModificationChange(change)) {
    await modifyStatus(change, client)
    return
  }
  await addStatus(change, client)
}

const filter: FilterCreator = ({ client, config }) => ({
  name: 'statusDeploymentFilter',
  onFetch: async (elements: Element[]) => {
    elements
      .filter(isInstanceElement)
      .filter(instance => instance.elemID.typeName === STATUS_TYPE_NAME)
      .filter(instance => instance.value.statusCategory !== undefined)
      .forEach(instance => {
        // statusCategory has a fixed number of options so we map the statusCategory name to its id
        instance.value.statusCategory =
          STATUS_CATEGORY_NAME_TO_ID[instance.value.statusCategory] ?? instance.value.statusCategory
      })

    if (!config.client.usePrivateAPI) {
      log.debug('Skipping status deployment filter because private API is not enabled')
      return
    }

    const statusType = findObject(elements, STATUS_TYPE_NAME)
    if (statusType === undefined) {
      return
    }

    statusType.annotations[CORE_ANNOTATIONS.CREATABLE] = true
    statusType.annotations[CORE_ANNOTATIONS.UPDATABLE] = true
    statusType.annotations[CORE_ANNOTATIONS.DELETABLE] = true
    setFieldDeploymentAnnotations(statusType, 'statusCategory')
    setFieldDeploymentAnnotations(statusType, 'description')
    setFieldDeploymentAnnotations(statusType, 'name')
    setFieldDeploymentAnnotations(statusType, 'id')
  },

  deploy: async changes => {
    const [relevantChanges, leftoverChanges] = _.partition(
      changes,
      change =>
        isInstanceChange(change) &&
        isAdditionOrModificationChange(change) &&
        getChangeData(change).elemID.typeName === STATUS_TYPE_NAME,
    )

    if (relevantChanges.length === 0) {
      return {
        leftoverChanges,
        deployResult: {
          errors: [],
          appliedChanges: [],
        },
      }
    }

    const deployResult = await deployChanges(
      relevantChanges.filter(isInstanceChange).filter(isAdditionOrModificationChange),
      async change => deployStatus(change, client),
    )

    return {
      leftoverChanges,
      deployResult,
    }
  },
})

export default filter
