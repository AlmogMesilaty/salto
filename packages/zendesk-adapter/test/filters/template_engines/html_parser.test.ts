/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import { ElemID, InstanceElement, ObjectType, ReferenceExpression } from '@salto-io/adapter-api'
import { ARTICLE_TYPE_NAME, BRAND_TYPE_NAME, ZENDESK } from '../../../src/constants'
import {
  parseUrlPotentialReferencesFromString,
  parseHtmlPotentialReferences,
} from '../../../src/filters/template_engines/html_parser'

describe('parseUrlPotentialReferencesFromString', () => {
  let urlBrandInstance: InstanceElement
  let matchBrandSubdomain: (url: string) => InstanceElement | undefined
  let article: InstanceElement
  let idsToElements: Record<string, InstanceElement>
  beforeEach(() => {
    urlBrandInstance = new InstanceElement('brand', new ObjectType({ elemID: new ElemID(ZENDESK, BRAND_TYPE_NAME) }), {
      id: 1,
      name: 'brand',
    })
    matchBrandSubdomain = jest.fn().mockReturnValue(urlBrandInstance)
    article = new InstanceElement('article', new ObjectType({ elemID: new ElemID(ZENDESK, ARTICLE_TYPE_NAME) }), {
      id: 222552,
    })
    idsToElements = {
      [urlBrandInstance.value.id]: urlBrandInstance,
      [article.value.id]: article,
    }
  })

  it('should extract URL references from a string', () => {
    const content = 'This is a string with a URL reference: {{help_center.url}}/hc/en-us/articles/222552'
    const result = parseUrlPotentialReferencesFromString(content, { matchBrandSubdomain, idsToElements })
    expect(result).toEqual({
      parts: [
        'This is a string with a URL reference: {{help_center.url}}/hc/en-us/articles/',
        new ReferenceExpression(article.elemID, article),
      ],
    })
  })

  it('should extract URL references from a string with multiple references', () => {
    const content =
      'This is a string with multiple URL references: https://some.domain.com/hc/en-us/articles/222552 and {{help_center.url}}/hc/en-us/articles/222552'
    const result = parseUrlPotentialReferencesFromString(content, { matchBrandSubdomain, idsToElements })
    expect(result).toEqual({
      parts: [
        'This is a string with multiple URL references: ',
        new ReferenceExpression(urlBrandInstance.elemID, urlBrandInstance),
        '/hc/en-us/articles/',
        new ReferenceExpression(article.elemID, article),
        ' and {{help_center.url}}/hc/en-us/articles/',
        new ReferenceExpression(article.elemID, article),
      ],
    })
  })

  it('should handle missing references when enableMissingReferences is true', () => {
    const content = 'This is a string with a missing URL reference: {{help_center.url}}/hc/en-us/articles/360001234568'
    const missingArticle = new InstanceElement(
      'missing_360001234568',
      new ObjectType({ elemID: new ElemID(ZENDESK, ARTICLE_TYPE_NAME) }),
      { id: '360001234568' },
      undefined,
      { salto_missing_ref: true },
    )
    const result = parseUrlPotentialReferencesFromString(content, {
      matchBrandSubdomain,
      idsToElements,
      enableMissingReferences: true,
    })
    expect(result).toEqual({
      parts: [
        'This is a string with a missing URL reference: {{help_center.url}}/hc/en-us/articles/',
        new ReferenceExpression(missingArticle.elemID, missingArticle),
      ],
    })
  })

  it('should handle missing references when enableMissingReferences is false', () => {
    const content = 'This is a string with a missing URL reference: {{help_center.url}}/hc/en-us/articles/360001234568'
    const result = parseUrlPotentialReferencesFromString(content, {
      matchBrandSubdomain,
      idsToElements,
      enableMissingReferences: false,
    })
    expect(result).toEqual(
      'This is a string with a missing URL reference: {{help_center.url}}/hc/en-us/articles/360001234568',
    )
  })
})

describe('parseHtmlPotentialReferences', () => {
  let urlBrandInstance: InstanceElement
  let matchBrandSubdomain: (url: string) => InstanceElement | undefined
  let article: InstanceElement
  let idsToElements: Record<string, InstanceElement>
  beforeEach(() => {
    urlBrandInstance = new InstanceElement('brand', new ObjectType({ elemID: new ElemID(ZENDESK, BRAND_TYPE_NAME) }), {
      id: 1,
      name: 'brand',
    })
    matchBrandSubdomain = jest.fn().mockReturnValue(urlBrandInstance)
    article = new InstanceElement('article', new ObjectType({ elemID: new ElemID(ZENDESK, ARTICLE_TYPE_NAME) }), {
      id: 222552,
    })
    idsToElements = {
      [urlBrandInstance.value.id]: urlBrandInstance,
      [article.value.id]: article,
    }
  })

  it('should extract URL references from HTML content', () => {
    const htmlContent = `
      <a href="{{help_center.url}}/hc/en-us/articles/222552">Link 1</a>
      <img src="{{help_center.url}}/image.jpg" alt="Image">
      <link href="{{help_center.url}}/styles.css" rel="stylesheet">
    `
    const result = parseHtmlPotentialReferences(htmlContent, { matchBrandSubdomain, idsToElements })
    expect(result.urls).toEqual([
      {
        value: {
          parts: ['{{help_center.url}}/hc/en-us/articles/', new ReferenceExpression(article.elemID, article)],
        },
        loc: { start: 16, end: 60 },
      },
      {
        value: '{{help_center.url}}/image.jpg',
        loc: { start: 89, end: 118 },
      },
      {
        value: '{{help_center.url}}/styles.css',
        loc: { start: 151, end: 181 },
      },
    ])
  })

  it('should handle Angular ng-href and ng-src', () => {
    const htmlContent = `
      <a ng-href="{{help_center.url}}/hc/en-us/articles/222552">Link 1</a>
      <img ng-src="{{help_center.url}}/image.jpg" alt="Image">
    `
    const result = parseHtmlPotentialReferences(htmlContent, { matchBrandSubdomain, idsToElements })
    expect(result.urls).toEqual([
      {
        value: {
          parts: ['{{help_center.url}}/hc/en-us/articles/', new ReferenceExpression(article.elemID, article)],
        },
        loc: { start: 19, end: 63 },
      },
      {
        value: '{{help_center.url}}/image.jpg',
        loc: { start: 95, end: 124 },
      },
    ])
  })

  it('should handle missing references when enableMissingReferences is true', () => {
    const htmlContent = `
      <a href="{{help_center.url}}/hc/en-us/articles/360001234568">Link 1</a>
      <a href="https://some.zendesk.subdomain/hc/en-us/articles/36000987654">Link 1</a>
    `
    const missingArticle = new InstanceElement(
      'missing_360001234568',
      new ObjectType({ elemID: new ElemID(ZENDESK, ARTICLE_TYPE_NAME) }),
      { id: '360001234568' },
      undefined,
      { salto_missing_ref: true },
    )
    const missingBrandArticle = new InstanceElement(
      'missing_brand_36000987654',
      new ObjectType({ elemID: new ElemID(ZENDESK, ARTICLE_TYPE_NAME) }),
      { id: '36000987654' },
      undefined,
      { salto_missing_ref: true },
    )
    const result = parseHtmlPotentialReferences(htmlContent, {
      matchBrandSubdomain,
      idsToElements,
      enableMissingReferences: true,
    })
    expect(result.urls).toEqual([
      {
        value: {
          parts: [
            '{{help_center.url}}/hc/en-us/articles/',
            new ReferenceExpression(missingArticle.elemID, missingArticle),
          ],
        },
        loc: { start: 16, end: 66 },
      },
      {
        value: {
          parts: [
            new ReferenceExpression(urlBrandInstance.elemID, urlBrandInstance),
            '/hc/en-us/articles/',
            new ReferenceExpression(missingBrandArticle.elemID, missingBrandArticle),
          ],
        },
        loc: { start: 94, end: 154 },
      },
    ])
  })

  it('should extract string content from script tags', () => {
    const htmlContent = `
      <script>
        const someVar = 'some value';
      </script>
    `
    const result = parseHtmlPotentialReferences(htmlContent, { matchBrandSubdomain, idsToElements })
    expect(result.scripts).toEqual([
      {
        value: expect.stringMatching(/\s+const someVar = 'some value';\s+/),
        loc: { start: 15, end: 59 },
      },
    ])
  })
})
