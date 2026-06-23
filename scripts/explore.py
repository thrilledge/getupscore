#!/usr/bin/env python3
"""Explore Upwork GraphQL API for filter options."""
import json
from curl_cffi import requests

session = requests.Session()
resp = session.get('https://www.upwork.com/', impersonate='safari17_0', timeout=60)
token = resp.cookies.get('visitor_gql_token')
print(f'Token: {token[:30] if token else None}...')

if not token:
    print('No token'); exit(1)

api_url = 'https://www.upwork.com/api/graphql/v1'
headers = {
    'Accept': '*/*',
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json',
    'X-Upwork-Accept-Language': 'en-US',
}

# Try various GraphQL queries
queries = [
    # 1. Skill autocomplete
    (
        'SearchSkills',
        'query SearchSkills($query: String!) { searchSkills(query: $query) { id prefLabel } }',
        {'query': 'react'}
    ),
    # 2. Categories
    (
        'Categories',
        '{ categories { id name urlSlug subcategories { id name } } }',
        {}
    ),
    # 3. Ontology skills
    (
        'SkillOntology',
        '{ skillOntology { skills { uid prefLabel } } }',
        {}
    ),
    # 4. Search filter config
    (
        'SearchFilterConfig',
        '{ searchFilterConfig { skills { uid prefLabel } categories { id name } contractorTiers { value label } } }',
        {}
    ),
    # 5. Visitor job search with aggregations (asks Upwork to return counts per filter)
    (
        'VisitorJobSearchWithAggs',
        '''query VisitorJobSearch($requestVariables: VisitorJobSearchV1Request!) {
            search { universalSearchNuxt {
                visitorJobSearchV1(request: $requestVariables) {
                    paging { total }
                    aggregations {
                        skills { uid prefLabel count }
                        categories { id name count }
                        jobTypes { value label count }
                        contractorTiers { value label count }
                    }
                }
            }}
        }''',
        {'requestVariables': {'sort': 'recency', 'paging': {'offset': 0, 'count': 1}}}
    ),
]

for name, query, variables in queries:
    try:
        payload = {'query': query, 'variables': variables}
        gql_resp = session.post(api_url, json=payload, headers=headers, impersonate='safari17_0', timeout=15)
        data = gql_resp.json()
        if 'errors' in data:
            msgs = [e.get('message', str(e))[:150] for e in data['errors'][:3]]
            print(f'\n--- {name}: ERRORS ---')
            for m in msgs: print(f'  {m}')
        else:
            print(f'\n--- {name}: SUCCESS ---')
            s = json.dumps(data['data'], ensure_ascii=False)
            if len(s) > 1000:
                print(s[:1000] + '...')
            else:
                print(s)
    except Exception as e:
        print(f'\n--- {name}: EXCEPTION {e}')
