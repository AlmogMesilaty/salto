/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import {
  Change,
  CORE_ANNOTATIONS,
  ElemIdGetter,
  getChangeData,
  InstanceElement,
  isAdditionChange,
  isInstanceChange,
  isModificationChange,
  ObjectType,
  Values,
} from '@salto-io/adapter-api'
import { naclCase, pathNaclCase, createSchemeGuard, applyFunctionToChangeData } from '@salto-io/adapter-utils'
import { elements as elementUtils } from '@salto-io/adapter-components'
import { logger } from '@salto-io/logging'
import Joi from 'joi'
import _ from 'lodash'
import { collections } from '@salto-io/lowerdash'
import { JIRA, WEBHOOK_TYPE } from '../../constants'
import JiraClient from '../../client/client'
import { FilterCreator } from '../../filter'
import { createWebhookTypes } from './types'
import { deployChanges } from '../../deployment/standard_deployment'

const { awu } = collections.asynciterable

const log = logger(module)

type WebhookValues = {
  self: string
}

const WEBHOOK_VALUES_SCHEME = Joi.object({
  self: Joi.string().required(),
})
  .unknown(true)
  .required()

const isWebhookValues = createSchemeGuard<WebhookValues>(WEBHOOK_VALUES_SCHEME, 'Received an invalid webhook response')

const isWebhooksResponse = createSchemeGuard<WebhookValues[]>(
  Joi.array().items(WEBHOOK_VALUES_SCHEME.optional()),
  'Received an invalid webhooks response',
)

const getIdFromSelf = (self: string): string | undefined => self.split('/').pop()

const createInstance = (values: Values, type: ObjectType, getElemIdFunc?: ElemIdGetter): InstanceElement => {
  const serviceIds = elementUtils.createServiceIds({ entry: values, serviceIDFields: ['id'], typeID: type.elemID })

  const defaultName = naclCase(values.name)

  const instanceName = getElemIdFunc && serviceIds ? getElemIdFunc(JIRA, serviceIds, defaultName).name : defaultName

  return new InstanceElement(
    instanceName,
    type,
    {
      ...values,
      filters: _.pickBy(
        {
          ...(values.filters ?? {}),
          'issue-related-events-section': undefined,
          issue_related_events_section: values.filters?.['issue-related-events-section'],
        },
        values.isDefined,
      ),
    },
    [JIRA, elementUtils.RECORDS_PATH, WEBHOOK_TYPE, pathNaclCase(instanceName)],
  )
}

const getWebhookValues = async (client: JiraClient): Promise<Values[]> => {
  const response = await client.getPrivate({
    url: '/rest/webhooks/1.0/webhook',
  })
  if (!isWebhooksResponse(response.data)) {
    throw new Error('Received invalid response from webhooks request')
  }
  return response.data.map((webhook: Values) => ({
    ...webhook,
    id: getIdFromSelf(webhook.self),
  }))
}

const transformInstance = (instance: InstanceElement): InstanceElement => {
  instance.annotations[CORE_ANNOTATIONS.CHANGED_BY] = instance.value.lastUpdatedDisplayName
  delete instance.value.lastUpdatedDisplayName
  delete instance.value.lastUpdatedUser
  delete instance.value.lastUpdated
  delete instance.value.self
  return instance
}

const createWebhook = async (instance: InstanceElement, client: JiraClient): Promise<void> => {
  const response = await client.post({
    url: '/rest/webhooks/1.0/webhook',
    data: instance.value,
  })

  if (!isWebhookValues(response.data)) {
    throw new Error('Failed to create webhook, received invalid response')
  }

  instance.value.id = getIdFromSelf(response.data.self)
}

const removeWebhook = async (instance: InstanceElement, client: JiraClient): Promise<void> => {
  await client.delete({
    url: `/rest/webhooks/1.0/webhook/${instance.value.id}`,
  })
}

const updateWebhook = async (instance: InstanceElement, client: JiraClient): Promise<void> => {
  await client.putPrivate({
    url: `/rest/webhooks/1.0/webhook/${instance.value.id}`,
    data: instance.value,
  })
}

const filter: FilterCreator = ({ client, getElemIdFunc, config, fetchQuery }) => ({
  name: 'webhookFilter',
  onFetch: async elements => {
    if (!fetchQuery.isTypeMatch(WEBHOOK_TYPE)) {
      return
    }

    if (!config.client.usePrivateAPI) {
      log.debug('Skipping webhook fetch filter because private API is not enabled')
      return
    }

    const webhooks = await getWebhookValues(client)

    const { webhookType, subTypes } = createWebhookTypes()

    const webhookInstances = webhooks
      .map(webhook => createInstance(webhook, webhookType, getElemIdFunc))
      .map(transformInstance)

    webhookInstances.forEach(instance => elements.push(instance))
    elements.push(webhookType, ...subTypes)
  },

  preDeploy: async changes => {
    await awu(changes)
      .filter(isInstanceChange)
      .filter(change => getChangeData(change).elemID.typeName === WEBHOOK_TYPE)
      .forEach(async change => {
        await applyFunctionToChangeData<Change<InstanceElement>>(change, instance => {
          if (instance.value.filters?.issue_related_events_section !== undefined) {
            instance.value.filters['issue-related-events-section'] = instance.value.filters.issue_related_events_section
            delete instance.value.filters.issue_related_events_section
          }
          return instance
        })
      })
  },

  onDeploy: async changes => {
    await awu(changes)
      .filter(isInstanceChange)
      .filter(change => getChangeData(change).elemID.typeName === WEBHOOK_TYPE)
      .forEach(async change => {
        await applyFunctionToChangeData<Change<InstanceElement>>(change, instance => {
          if (instance.value.filters?.['issue-related-events-section'] !== undefined) {
            instance.value.filters.issue_related_events_section = instance.value.filters['issue-related-events-section']
            delete instance.value.filters['issue-related-events-section']
          }
          return instance
        })
      })
  },

  deploy: async changes => {
    const [relevantChanges, leftoverChanges] = _.partition(
      changes,
      change => isInstanceChange(change) && getChangeData(change).elemID.typeName === WEBHOOK_TYPE,
    )

    const deployResult = await deployChanges(relevantChanges.filter(isInstanceChange), async change => {
      if (isAdditionChange(change)) {
        await createWebhook(getChangeData(change), client)
      } else if (isModificationChange(change)) {
        await updateWebhook(getChangeData(change), client)
      } else {
        await removeWebhook(getChangeData(change), client)
      }
    })

    return {
      leftoverChanges,
      deployResult,
    }
  },
})

export default filter
