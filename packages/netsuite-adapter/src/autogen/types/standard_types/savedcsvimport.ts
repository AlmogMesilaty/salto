/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
/* eslint-disable max-len */
/* eslint-disable camelcase */
import {
  BuiltinTypes,
  createRefToElmWithValue,
  CORE_ANNOTATIONS,
  ElemID,
  ObjectType,
  createRestriction,
  ListType,
} from '@salto-io/adapter-api'
import * as constants from '../../../constants'
import { TypeAndInnerTypes } from '../../../types/object_types'
import { enums } from '../enums'

export const savedcsvimportType = (): TypeAndInnerTypes => {
  const innerTypes: Record<string, ObjectType> = {}

  const savedcsvimportElemID = new ElemID(constants.NETSUITE, 'savedcsvimport')
  const savedcsvimport_audienceElemID = new ElemID(constants.NETSUITE, 'savedcsvimport_audience')

  const savedcsvimport_audience = new ObjectType({
    elemID: savedcsvimport_audienceElemID,
    annotations: {},
    fields: {
      ispublic: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F. */,
      globaledit: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F. */,
      allemployees: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F. */,
      allpartners: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F. */,
      allroles: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F. */,
      roles: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING /* Original type was multi-select list */),
        annotations: {},
      } /* Original description: You can specify multiple values by separating each value with a pipe (|) symbol.   This field accepts references to the role custom type.   For information about other possible values, see generic_role. */,
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, savedcsvimportElemID.name],
  })

  innerTypes.savedcsvimport_audience = savedcsvimport_audience

  const savedcsvimport_filemappings_filemappingElemID = new ElemID(
    constants.NETSUITE,
    'savedcsvimport_filemappings_filemapping',
  )

  const savedcsvimport_filemappings_filemapping = new ObjectType({
    elemID: savedcsvimport_filemappings_filemappingElemID,
    annotations: {},
    fields: {
      file: {
        refType: createRefToElmWithValue(
          BuiltinTypes.STRING /* Original type was join   Join field types must be set to a colon-delimited list of values. */,
        ),
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
        },
      } /* Original description: You can specify multiple values by separating each value with a pipe (|) symbol. */,
      primarykey: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING),
        annotations: {},
      },
      foreignkey: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING),
        annotations: {},
      },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, savedcsvimportElemID.name],
  })

  innerTypes.savedcsvimport_filemappings_filemapping = savedcsvimport_filemappings_filemapping

  const savedcsvimport_filemappingsElemID = new ElemID(constants.NETSUITE, 'savedcsvimport_filemappings')

  const savedcsvimport_filemappings = new ObjectType({
    elemID: savedcsvimport_filemappingsElemID,
    annotations: {},
    fields: {
      filemapping: {
        refType: createRefToElmWithValue(new ListType(savedcsvimport_filemappings_filemapping)),
        annotations: {},
      },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, savedcsvimportElemID.name],
  })

  innerTypes.savedcsvimport_filemappings = savedcsvimport_filemappings

  const savedcsvimport_recordmappings_recordmapping_fieldmappings_fieldmapping_columnreferenceElemID = new ElemID(
    constants.NETSUITE,
    'savedcsvimport_recordmappings_recordmapping_fieldmappings_fieldmapping_columnreference',
  )

  const savedcsvimport_recordmappings_recordmapping_fieldmappings_fieldmapping_columnreference = new ObjectType({
    elemID: savedcsvimport_recordmappings_recordmapping_fieldmappings_fieldmapping_columnreferenceElemID,
    annotations: {},
    fields: {
      file: {
        refType: createRefToElmWithValue(
          BuiltinTypes.STRING /* Original type was join   Join field types must be set to a colon-delimited list of values. */,
        ),
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
        },
      } /* Original description: You can specify multiple values by separating each value with a pipe (|) symbol. */,
      column: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING),
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
        },
      },
      type: {
        refType: createRefToElmWithValue(enums.csvimport_referencetype),
        annotations: {},
      } /* Original description: For information about possible values, see csvimport_referencetype. */,
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, savedcsvimportElemID.name],
  })

  innerTypes.savedcsvimport_recordmappings_recordmapping_fieldmappings_fieldmapping_columnreference =
    savedcsvimport_recordmappings_recordmapping_fieldmappings_fieldmapping_columnreference

  const savedcsvimport_recordmappings_recordmapping_fieldmappings_fieldmappingElemID = new ElemID(
    constants.NETSUITE,
    'savedcsvimport_recordmappings_recordmapping_fieldmappings_fieldmapping',
  )

  const savedcsvimport_recordmappings_recordmapping_fieldmappings_fieldmapping = new ObjectType({
    elemID: savedcsvimport_recordmappings_recordmapping_fieldmappings_fieldmappingElemID,
    annotations: {},
    fields: {
      field: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING /* Original type was single-select list */),
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
        },
      } /* Original description: This field accepts references to the following custom types:   transactioncolumncustomfield   transactionbodycustomfield   othercustomfield   itemoptioncustomfield   itemnumbercustomfield   itemcustomfield   entitycustomfield   customsegment   customrecordcustomfield   crmcustomfield */,
      value: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING),
        annotations: {},
      },
      columnreference: {
        refType: createRefToElmWithValue(
          savedcsvimport_recordmappings_recordmapping_fieldmappings_fieldmapping_columnreference,
        ),
        annotations: {},
      },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, savedcsvimportElemID.name],
  })

  innerTypes.savedcsvimport_recordmappings_recordmapping_fieldmappings_fieldmapping =
    savedcsvimport_recordmappings_recordmapping_fieldmappings_fieldmapping

  const savedcsvimport_recordmappings_recordmapping_fieldmappingsElemID = new ElemID(
    constants.NETSUITE,
    'savedcsvimport_recordmappings_recordmapping_fieldmappings',
  )

  const savedcsvimport_recordmappings_recordmapping_fieldmappings = new ObjectType({
    elemID: savedcsvimport_recordmappings_recordmapping_fieldmappingsElemID,
    annotations: {},
    fields: {
      fieldmapping: {
        refType: createRefToElmWithValue(
          new ListType(savedcsvimport_recordmappings_recordmapping_fieldmappings_fieldmapping),
        ),
        annotations: {},
      },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, savedcsvimportElemID.name],
  })

  innerTypes.savedcsvimport_recordmappings_recordmapping_fieldmappings =
    savedcsvimport_recordmappings_recordmapping_fieldmappings

  const savedcsvimport_recordmappings_recordmappingElemID = new ElemID(
    constants.NETSUITE,
    'savedcsvimport_recordmappings_recordmapping',
  )

  const savedcsvimport_recordmappings_recordmapping = new ObjectType({
    elemID: savedcsvimport_recordmappings_recordmappingElemID,
    annotations: {},
    fields: {
      record: {
        refType: createRefToElmWithValue(
          BuiltinTypes.STRING /* Original type was join   Join field types must be set to a colon-delimited list of values. */,
        ),
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
        },
      } /* Original description: You can specify multiple values by separating each value with a pipe (|) symbol. */,
      line: {
        refType: createRefToElmWithValue(BuiltinTypes.NUMBER),
        annotations: {},
      },
      fieldmappings: {
        refType: createRefToElmWithValue(savedcsvimport_recordmappings_recordmapping_fieldmappings),
        annotations: {},
      },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, savedcsvimportElemID.name],
  })

  innerTypes.savedcsvimport_recordmappings_recordmapping = savedcsvimport_recordmappings_recordmapping

  const savedcsvimport_recordmappingsElemID = new ElemID(constants.NETSUITE, 'savedcsvimport_recordmappings')

  const savedcsvimport_recordmappings = new ObjectType({
    elemID: savedcsvimport_recordmappingsElemID,
    annotations: {},
    fields: {
      recordmapping: {
        refType: createRefToElmWithValue(new ListType(savedcsvimport_recordmappings_recordmapping)),
        annotations: {},
      },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, savedcsvimportElemID.name],
  })

  innerTypes.savedcsvimport_recordmappings = savedcsvimport_recordmappings

  const savedcsvimport = new ObjectType({
    elemID: savedcsvimportElemID,
    annotations: {},
    fields: {
      scriptid: {
        refType: createRefToElmWithValue(BuiltinTypes.SERVICE_ID),
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
          [constants.IS_ATTRIBUTE]: true,
          [CORE_ANNOTATIONS.RESTRICTION]: createRestriction({ regex: '^custimport[0-9a-z_]+' }),
        },
      } /* Original description: This attribute value can be up to 40 characters long.   The default value is ‘custimport’. */,
      recordtype: {
        refType: createRefToElmWithValue(enums.csvimport_recordtypes),
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
        },
      } /* Original description: For information about possible values, see csvimport_recordtypes. */,
      importname: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING /* Original type was single-select list */),
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
          // [CORE_ANNOTATIONS.RESTRICTION]: createRestriction({ max_length: 64 }),
        },
      } /* Original description: This field value can be up to 64 characters long.   This field accepts references to the string custom type. */,
      datahandling: {
        refType: createRefToElmWithValue(enums.csvimport_datahandling),
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
        },
      } /* Original description: For information about possible values, see csvimport_datahandling.   The default value is 'ADD'. */,
      decimaldelimiter: {
        refType: createRefToElmWithValue(enums.csvimport_decimaldelimiter),
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
        },
      } /* Original description: For information about possible values, see csvimport_decimaldelimiter. */,
      columndelimiter: {
        refType: createRefToElmWithValue(enums.csvimport_columndelimiter),
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
        },
      } /* Original description: For information about possible values, see csvimport_columndelimiter. */,
      entryform: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING /* Original type was single-select list */),
        annotations: {},
      } /* Original description: This field is available when the recordtype value is present in any of the following lists or values: csvimports_entryformrecordtypes, csvimport_customrecordtype.   This field is mandatory when the recordtype value is present in csvimports_entryformrecordtypes.   This field accepts references to the entryForm custom type.   For information about other possible values, see csvimport_entryform_standard. */,
      transactionform: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING /* Original type was single-select list */),
        annotations: {},
      } /* Original description: This field is available when the recordtype value is present in any of the following lists or values: csvimports_transactionformrecordtypes, csvimport_customtransactiontype.   This field is mandatory when the recordtype value is present in csvimports_transactionformrecordtypes.   This field accepts references to the transactionForm custom type.   For information about other possible values, see csvimport_transactionform_standard. */,
      customrecord: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING /* Original type was single-select list */),
        annotations: {},
      } /* Original description: This field is available when the recordtype value is equal to CUSTOMRECORD.   This field is mandatory when the recordtype value is equal to CUSTOMRECORD.   This field accepts references to the customrecordtype custom type.   For information about other possible values, see generic_standard_recordtype. */,
      customtransaction: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING /* Original type was single-select list */),
        annotations: {},
      } /* Original description: This field is available when the recordtype value is equal to CUSTOMTRANSACTION.   This field is mandatory when the recordtype value is equal to CUSTOMTRANSACTION.   This field accepts references to the customtransactiontype custom type. */,
      charencoding: {
        refType: createRefToElmWithValue(enums.csvimport_encoding),
        annotations: {},
      } /* Original description: For information about possible values, see csvimport_encoding.   The default value is 'windows-1252'. */,
      logsystemnotescustfields: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F. */,
      overwritemissingfields: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the recordtype value is not equal to CURRENCYRATE.   The default value is F. */,
      validatemandatorycustfields: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is T. */,
      overwritesublists: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F. */,
      ignorereadonly: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the recordtype value is not equal to any of the following lists or values: CUSTOMERANDCONTACT, LEADANDCONTACT, PROSPECTANDCONTACT.   The default value is T. */,
      preventduplicates: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: This field is available when the recordtype value is equal to any of the following lists or values: CUSTOMERANDCONTACT, LEADANDCONTACT, PROSPECTANDCONTACT, CONTACT, LEAD, PARTNER, VENDOR, CUSTOMER, PROSPECT.   The default value is F. */,
      usemultithread: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is F. */,
      runserversuitescript: {
        refType: createRefToElmWithValue(BuiltinTypes.BOOLEAN),
        annotations: {},
      } /* Original description: The default value is T. */,
      multiselectdelimiter: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING),
        annotations: {
          // [CORE_ANNOTATIONS.RESTRICTION]: createRestriction({ max_length: 1 }),
        },
      } /* Original description: This field value can be up to 1 characters long.   The default value is '|'. */,
      description: {
        refType: createRefToElmWithValue(BuiltinTypes.STRING /* Original type was single-select list */),
        annotations: {
          // [CORE_ANNOTATIONS.RESTRICTION]: createRestriction({ max_length: 499 }),
        },
      } /* Original description: This field value can be up to 499 characters long.   This field accepts references to the string custom type. */,
      audience: {
        refType: createRefToElmWithValue(savedcsvimport_audience),
        annotations: {},
      },
      filemappings: {
        refType: createRefToElmWithValue(savedcsvimport_filemappings),
        annotations: {},
      },
      recordmappings: {
        refType: createRefToElmWithValue(savedcsvimport_recordmappings),
        annotations: {},
      },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, savedcsvimportElemID.name],
  })

  return { type: savedcsvimport, innerTypes }
}
