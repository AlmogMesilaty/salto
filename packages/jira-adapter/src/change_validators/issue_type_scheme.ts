/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import {
  ChangeValidator,
  getChangeData,
  isInstanceChange,
  isModificationChange,
  isRemovalChange,
  SeverityLevel,
} from '@salto-io/adapter-api'
import { resolveChangeElement } from '@salto-io/adapter-components'
import { logger } from '@salto-io/logging'
import { getLookUpName } from '../reference_mapping'
import { getDiffIds } from '../diff'
import { ISSUE_TYPE_NAME, ISSUE_TYPE_SCHEMA_NAME } from '../constants'

const log = logger(module)

export const issueTypeSchemeValidator: ChangeValidator = async changes => {
  const instanceChanges = changes.filter(isInstanceChange)

  const defaultIssueTypeSchemeChanges = instanceChanges
    .filter(isModificationChange)
    .filter(change => getChangeData(change).elemID.typeName === ISSUE_TYPE_SCHEMA_NAME)
    .filter(change => getChangeData(change).value.isDefault)

  if (defaultIssueTypeSchemeChanges.length !== 1) {
    log.warn(`Expected exactly one default issue type scheme change, found ${defaultIssueTypeSchemeChanges.length}`)
    return []
  }

  const [defaultIssueTypeSchemeChange] = defaultIssueTypeSchemeChanges

  const resolvedDefaultSchemeChange = await resolveChangeElement(defaultIssueTypeSchemeChange, getLookUpName)
  const { removedIds: removedIdsFromDefaultScheme } = getDiffIds(
    resolvedDefaultSchemeChange.data.before.value.issueTypeIds,
    resolvedDefaultSchemeChange.data.after.value.issueTypeIds,
  )

  const deletedIds = instanceChanges
    .filter(isRemovalChange)
    .filter(change => getChangeData(change).elemID.typeName === ISSUE_TYPE_NAME)
    // issue types will always have ids on removal, because we receive them on
    // fetch and the user can't delete them because they are hidden
    .map(change => getChangeData(change).value.id)

  // We should also check in the element source if the issue was deleted
  // in case the changes of the issueType deletion and the issueTypeScheme
  // were deployed in two separate deployments (doesn't supposed to happen,
  // unless there was some unexpected error in the original deployment that
  // contains both of them). See SALTO-1981
  const deletedIdsSet = new Set(deletedIds)

  if (removedIdsFromDefaultScheme.every(id => deletedIdsSet.has(id))) {
    return []
  }

  const { elemID } = getChangeData(resolvedDefaultSchemeChange)

  return [
    {
      elemID,
      severity: 'Error' as SeverityLevel,
      message: 'Cannot remove issue types from default issue type scheme',
      detailedMessage: 'Removing issue types from the default issue type scheme is not supported',
    },
  ]
}
