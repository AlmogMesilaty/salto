/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import {
  Element,
  Change,
  PostFetchOptions,
  DeployResult,
  SaltoElementError,
  SaltoError,
  ChangeGroup,
} from '@salto-io/adapter-api'
import { logger } from '@salto-io/logging'
import { types, promises, values, collections, objects } from '@salto-io/lowerdash'

const { awu } = collections.asynciterable
const { concatObjects } = objects

const { isDefined } = values

const log = logger(module)

// Filters run in a specific order and get a mutable list as input which they may modify
// to affect the overall result as well as the input for subsequent filters.
// Each filter will be created once and so it may store context between preDeploy and onDeploy.
// Note that it cannot store context between onFetch and the other callbacks since these run in
// separate commands
export type FilterResult = Record<string, unknown[] | undefined>

export type FilterMetadata = {
  name: string
}

export type Filter<T extends FilterResult | void, DeployInfo = void> = Partial<{
  onFetch(elements: Element[]): Promise<T | void>
  preDeploy(changes: Change[]): Promise<void>
  // TODO add changeGroup everywhere and switch to named params (SALTO-5531)
  deploy(
    changes: Change[],
    changeGroup?: ChangeGroup,
  ): Promise<{
    deployResult: DeployResult
    leftoverChanges: Change[]
  }>
  onDeploy(changes: Change[], deployInfo: DeployInfo): Promise<void>
  onPostFetch(args: PostFetchOptions): Promise<void>
}> &
  FilterMetadata

export type FilterWith<
  T extends FilterResult | void,
  // eslint-disable-next-line no-use-before-define
  M extends keyof Filter<T, DeployInfo>,
  DeployInfo = void,
> = types.HasMember<Filter<T, DeployInfo>, M>

export type FilterCreator<R extends FilterResult | void, T, DeployInfo = void> = (opts: T) => Filter<R, DeployInfo>

export type RemoteFilterCreator<R extends FilterResult | void, T, DeployInfo = void> = (
  opts: T,
) => Filter<R, DeployInfo> & { remote: true }

export type LocalFilterCreatorDefinition<R extends FilterResult | void, T, DeployInfo = void> = {
  creator: FilterCreator<R, T, DeployInfo>
  addsNewInformation?: false
}

export type RemoteFilterCreatorDefinition<R extends FilterResult | void, T, DeployInfo = void> = {
  creator: RemoteFilterCreator<R, T, DeployInfo>
  addsNewInformation: true
}

export const isLocalFilterCreator = <
  RLocal extends FilterResult | void,
  RRemote extends FilterResult | void,
  TLocal,
  TRemote,
  DLocal = void,
  DRemote = void,
>(
  filterDef:
    | LocalFilterCreatorDefinition<RLocal, TLocal, DLocal>
    | RemoteFilterCreatorDefinition<RRemote, TRemote, DRemote>,
): filterDef is LocalFilterCreatorDefinition<RLocal, TLocal, DLocal> => filterDef.addsNewInformation !== true

export const filtersRunner = <R extends FilterResult | void, T, DeployInfo = void>(
  opts: T,
  filterCreators: ReadonlyArray<FilterCreator<R, T, DeployInfo>>,
  onFetchAggregator: (results: R[]) => R | void = () => undefined,
): Required<Filter<R, DeployInfo>> => {
  // Create all filters in advance to allow them to hold context between calls
  const allFilters = filterCreators.map(f => f(opts))

  const filtersWith = <M extends keyof Filter<R, DeployInfo>>(m: M): FilterWith<R, M, DeployInfo>[] =>
    types.filterHasMember<Filter<R, DeployInfo>, M>(m, allFilters)

  return {
    name: '',
    onFetch: async elements => {
      const filterResults = (
        await promises.array.series(
          filtersWith('onFetch').map(
            filter => () => log.timeDebug(() => filter.onFetch(elements), `(${filter.name}):onFetch`),
          ),
        )
      ).filter(isDefined)
      return onFetchAggregator(filterResults)
    },
    /**
     * on preDeploy the filters are run in reverse order and are expected to "undo" any
     * relevant change they made in onFetch. because of this, each filter can expect
     * to get in preDeploy a similar value to what it created in onFetch.
     */
    preDeploy: async changes => {
      await promises.array.series(
        filtersWith('preDeploy')
          .reverse()
          .map(filter => () => log.timeDebug(() => filter.preDeploy(changes), `(${filter.name}):preDeploy`)),
      )
    },
    /**
     * deploy method for implementing a deployment functionality.
     */
    deploy: async (changes, changeGroup) =>
      awu(filtersWith('deploy')).reduce(
        async (total, current) => {
          const { deployResult, leftoverChanges } = await log.timeDebug(
            () => current.deploy(total.leftoverChanges, changeGroup),
            `(${current.name}):deploy`,
          )
          return {
            deployResult: concatObjects([total.deployResult, deployResult]),
            leftoverChanges,
          }
        },
        {
          deployResult: {
            appliedChanges: [] as ReadonlyArray<Change>,
            errors: [] as ReadonlyArray<SaltoError | SaltoElementError>,
          },
          leftoverChanges: changes,
        },
      ),
    /**
     * onDeploy is called in the same order as onFetch and is expected to do basically
     * the same thing that onFetch does but with a different context (on changes instead
     * of on elements)
     */
    onDeploy: async (changes, deployResult) => {
      await promises.array.series(
        filtersWith('onDeploy').map(
          filter => () => log.timeDebug(() => filter.onDeploy(changes, deployResult), `(${filter.name}):onDeploy`),
        ),
      )
    },
    /**
     * onPostFetch is run after fetch completed for all accounts, and receives
     * as context all the elements for the env. It should only be used to change
     * references, and should not make any changes that other accounts might rely on.
     * There is no guarantee on the order in which the onPostFetch operations from
     * different adapters are performed, only within each adapter.
     * The filters are run in the same order as onFetch.
     */
    onPostFetch: async args => {
      await promises.array.series(
        filtersWith('onPostFetch').map(
          filter => () => log.timeDebug(() => filter.onPostFetch(args), `(${filter.name}):onPostFetch`),
        ),
      )
    },
  }
}
