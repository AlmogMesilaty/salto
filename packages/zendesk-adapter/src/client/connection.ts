/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import _ from 'lodash'
import axios from 'axios'
import axiosRetry from 'axios-retry'
import { AccountInfo } from '@salto-io/adapter-api'
import { client as clientUtils } from '@salto-io/adapter-components'
import { logger } from '@salto-io/logging'
import Joi from 'joi'
import { createSchemeGuard } from '@salto-io/adapter-utils'
import {
  APITokenCredentials,
  Credentials,
  isAPITokenCredentials,
  isOauthAccessTokenCredentials,
  OauthAccessTokenCredentials,
  UsernamePasswordCredentials,
} from '../auth'

const log = logger(module)
type AccountRes = {
  data: {
    account: {
      sandbox: boolean
    }
  }
}

const EXPECTED_VALID_ACCOUNT_RES = Joi.object({
  data: Joi.object({
    account: Joi.object({
      sandbox: Joi.boolean().required(),
    })
      .unknown(true)
      .required(),
  })
    .unknown(true)
    .required(),
})
  .unknown(true)
  .required()

export const instanceUrl = (subdomain: string, domain?: string): string =>
  _.isEmpty(domain) ? `https://${subdomain}.zendesk.com` : `https://${subdomain}.${domain}`
const baseUrl = instanceUrl
// A URL for resource files
const resourceUrl = (subdomain: string, domain?: string): string => new URL('/', instanceUrl(subdomain, domain)).href

const MARKETPLACE_NAME = 'Salto'
const MARKETPLACE_ORG_ID = 5110
const MARKETPLACE_APP_ID = 608042

export const APP_MARKETPLACE_HEADERS = {
  'X-Zendesk-Marketplace-Name': MARKETPLACE_NAME,
  'X-Zendesk-Marketplace-Organization-Id': MARKETPLACE_ORG_ID,
  'X-Zendesk-Marketplace-App-Id': MARKETPLACE_APP_ID,
}

const isValidAccountRes = createSchemeGuard<AccountRes>(
  EXPECTED_VALID_ACCOUNT_RES,
  'Received an invalid current account response',
)

export const validateCredentials = async ({
  credentials,
  connection,
}: {
  credentials: Credentials
  connection: clientUtils.APIConnection
}): Promise<AccountInfo> => {
  try {
    const res = await connection.get('/api/v2/account')
    const accountId = instanceUrl(credentials.subdomain, credentials.domain)
    if (isValidAccountRes(res)) {
      const isProduction = !res.data.account.sandbox
      return { accountId, isProduction }
    }
    log.warn('res is not valid for /api/v2/account, could not find if account is production')
    return { accountId }
  } catch (e) {
    log.error('Failed to validate credentials: %s', e)
    throw new clientUtils.UnauthorizedError(e)
  }
}

const usernamePasswordAuthParamsFunc = ({
  username,
  password,
}: UsernamePasswordCredentials): clientUtils.AuthParams => ({
  auth: {
    username,
    password,
  },
  headers: APP_MARKETPLACE_HEADERS,
})

const apiTokenAuthParamsFunc = ({ username, token }: APITokenCredentials): clientUtils.AuthParams => ({
  auth: {
    username: `${username}/token`,
    password: token,
  },
  headers: APP_MARKETPLACE_HEADERS,
})

const accessTokenAuthParamsFunc = ({ accessToken }: OauthAccessTokenCredentials): clientUtils.AuthParams => ({
  headers: {
    Authorization: `Bearer ${accessToken}`,
    ...APP_MARKETPLACE_HEADERS,
  },
})

const authParamsFunc = (creds: Credentials): clientUtils.AuthParams => {
  if (isOauthAccessTokenCredentials(creds)) {
    return accessTokenAuthParamsFunc(creds)
  }
  if (isAPITokenCredentials(creds)) {
    return apiTokenAuthParamsFunc(creds)
  }
  return usernamePasswordAuthParamsFunc(creds)
}

export const createConnection: clientUtils.ConnectionCreator<Credentials> = (retryOptions, timeout) =>
  clientUtils.axiosConnection({
    retryOptions,
    authParamsFunc: async (creds: Credentials) => authParamsFunc(creds),
    baseURLFunc: async ({ subdomain, domain }) => baseUrl(subdomain, domain),
    credValidateFunc: validateCredentials,
    timeout,
  })

export const createResourceConnection: clientUtils.ConnectionCreator<Credentials> = retryOptions => {
  const login = async (creds: Credentials): Promise<clientUtils.AuthenticatedAPIConnection> => {
    const httpClient = axios.create({
      baseURL: resourceUrl(creds.subdomain, creds.domain),
      headers: APP_MARKETPLACE_HEADERS,
    })
    axiosRetry(httpClient, retryOptions)
    return Object.assign(httpClient, { accountInfo: { accountId: creds.subdomain } })
  }
  return {
    login,
  }
}
