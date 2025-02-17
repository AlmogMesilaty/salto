/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import { ElemID, ObjectType, BuiltinTypes } from '@salto-io/adapter-api'
import { auth as authUtils } from '@salto-io/adapter-components'
import * as constants from './constants'

const configID = new ElemID(constants.SAP)

export const oauthClientCredentialsType = new ObjectType({
  elemID: configID,
  fields: {
    clientId: {
      refType: BuiltinTypes.STRING,
      annotations: { message: 'OAuth client ID' },
    },
    clientSecret: {
      refType: BuiltinTypes.STRING,
      annotations: { message: 'OAuth client secret' },
    },
    authorizationUrl: {
      refType: BuiltinTypes.STRING,
      annotations: { message: 'Authorization url' },
    },
    baseUrl: {
      refType: BuiltinTypes.STRING,
      annotations: { message: 'Base service url' },
    },
  },
})

export type OAuthClientCredentials = authUtils.OAuthClientCredentialsArgs & {
  authUrl: string
  baseUrl: string
}

export type Credentials = OAuthClientCredentials
