"""
Test: Can we fetch Upwork job page HTML or GraphQL API with user-provided cookies?
"""

COOKIE_STRING = "visitor_id=202.66.180.110.1782163603949000; x-spec-id=531f0cc6-8b0b-4b35-acd5-fdb67eabccb5; _cq_duid=1.1782163611.YswZZ7JRou4Vn5LV; tatari-session-cookie=d3b32df1-873c-831b-4582-7018591d769c; __ps_r=_; __ps_lu=https://www.upwork.com/nx/search/jobs/?category2_uid=531770282580668418&nbs=1&q=wordpress+developer&sort=relevance%2Bdesc&subcategory2_uid=531770282589057029&__cf_chl_tk=HDIznYWXmZvI2APP.tjInVm5qVN7riC1.izwC6hd.vE-1782163596-1.0.1.1-_1egH2hvv68Zm5tuXKR8mAG4Z8K7p4VC29y9rDyqPIk; __ps_did=pscrb_d62e66d5-49f6-4001-bcdb-068ec71a960d; __ps_fva=1782163613341; __pdst=cbe5fc5d03a243859628e15dc1c0954f; _fbp=fb.1.1782163613546.378800249943291748; _twpid=tw.1782163613750.836120414456475054; _tt_enable_cookie=1; _ttp=01KVRKNAF8T9DRS2A0Y6M3W21T_.tt.1; g_state={\"i_l\":0,\"i_ll\":1782165462223,\"i_b\":\"nTOWMKVSWh1qy2a8VuvE4bWX7MY6QayCvvZz1ssyoXk\",\"i_e\":{\"enable_itp_optimization\":24},\"i_et\":1782165462223}; recognized=ddf544d8; current_organization_uid=1658109706005303297; company_last_accessed=d1033504861; uThemeNull=1; ftr_ncd=6; tkbl_session=b9e5b435-de3a-4631-be60-0ca52a4f369a; _ga_SB157S2R94=GS2.2.s1784029057$o1$g1$t1784029062$j55$l0$h0; enabled_ff=!CI12577UniversalSearch,!Fluid,!MP16400Air3Migration,!SSINavUser,!TranscendUIOn,!i18nGA,CI17409DarkModeUI,CmpLibOn,JPAir3,OTBnrOn,SSINavUserBpa,TONB2256Air3Migration,WP658TranscendOn,i18nOn; country_code=PK; cookie_prefix=; cookie_domain=.upwork.com; XSRF-TOKEN=2079502534008567940; oauth2_global_js_token=oauth2v2_int_3ece7316553a9703c194a5c9925398d0; _cq_suid=1.1784627022.O7qy86SAOMtONCu6; _ga=GA1.1.2078431227.1782163615; IR_gbd=upwork.com; _upw_ses.5831=*; umq_cq=1199; OptanonAlertBoxClosed=2026-07-21T14:16:52.607Z; __ps_sr=_; __ps_slu=https://www.upwork.com/jobs/~022079495762869854410?referrer_url_path=%2Fbest-matches%2Fdetails%2F%7E022079495762869854410&__cf_chl_tk=ajHe5l5wSakP5m7BL88G7Qb.loKnTQjktxeEYGpDDwk-1784646385-1.0.1.1-1a.B.36E1IkRwbUo3XiNNjBNE9nPN1Cz7dZbBqvj3w0; umq=1214; JobDetailsNuxt_vt=oauth2v2_int_77b1cf993321a21214b380d0dc436987; tatari-cookie-test=42635583; _cq_s=qhUfzkOLq39Q7ySx:lcDZqKqkKxOi/Ic6h0/wXnQY05T8SkmAlug3zMaC9SANY+ndseBmC6crhW17udK6sfwvhR5WWJdBZ6+0mF6NzMLjxuH3w9C4ftV8Dh/tHRN8nBsJ6GgsRidafGE=:jmq/c6+oxTYbV8+3O8UEDw==; OptanonConsent=consentId=1658109706005303296&datestamp=Tue+Jul+21+2026+20%3A07%3A44+GMT%2B0500+(Pakistan+Standard+Time)&version=202512.1.0&isAnonUser=0&isGpcEnabled=0&browserGpcFlag=0&isIABGlobal=false&identifierType=Cookie+Unique+Id&hosts=&interactionCount=40&landingPath=NotLandingPage&iType=undefined&groups=C0001%3A1%2CC0002%3A1%2CC0003%3A1%2CC0004%3A1&crTime=1784646464395&intType=&geolocation=PK%3BPB&AwaitingReconsent=false; _upw_id.5831=c21551c6-e37a-4196-87aa-90dc5921c1da.1782163608.18.1784646465.1784638044.cb366302-4b69-48d7-afcc-ce5ea4caf114.27d1a209-dd9f-4f05-8e38-da2c192c1a03.069ccc3d-2bca-44bd-b129-69f4ed175afc.1784642638069.488; _gcl_au=1.1.305682481.1782163611.-.-.1782165467.987598886.1784627028.1784646465; _ga_KSM221PNDX=GS2.1.s1784646385$o20$g1$t1784646466$j56$l0$h0; IR_PI=cff477fd-6ee4-11f1-9d47-cf4207f54bf3%7C1784732866624; IR_13634=1784646466626%7C0%7C1784646466626%7C%7C; _uetsid=ace7b1a084e811f1b54a7717d745fba3; _uetvid=16bcf9106e8111f1a1a1e3047b7d0305; _rdt_uuid=1782163613201.d27f4182-16bc-494c-aa9e-db6cab2644be; _rdt_em=:4c19ba4bb06f65b684a014267059dbb4ed9fd146c92b22bafa7f457350abd089,4c19ba4bb06f65b684a014267059dbb4ed9fd146c92b22bafa7f457350abd089; AWSALB=fwFezhuliFcemzOq+IsNLjuguB2DoLzYPD740Yk4tqbNSJzTKQmkA8BP5wYfLANVjICrhVAFQERCRL1pfCmN2t2nL6AUrSsmRkR1sGmRIsr1jZRcfyGQxzCdOpUvN; AWSALBCORS=fwFezhuliFcemzOq+IsNLjuguB2DoLzYPD740Yk4tqbNSJzTKQmkA8BP5wYfLANVjICrhVAFQERCRL1pfCmN2t2nL6AUrSsmRkR1sGmRIsr1jZRcfyGQxzCdOpUvN; ttcsid_CGCUGEBC77UAPU79F02G=1784642643473::H055CLWI7EQJgm7nw7aa.19.1784646467033.1; _cq_session=18.1784642638645.ULZZalynfxC9257s.1784646465083; visitor_signup_gql_token=oauth2v2_int_ee9828bcd15ac594ccea3165f3650895; AWSALBTGCORS=s2Vu//QeuG1eP68qXGwxvdqTSC2f8pSXLWXP8rxgy0gVVjGgG67oxRLJAAWvvm4f3T+81T8vExliyGsCaNFbF9yBVO3UQNeCkOMLXw3VrZWVECQEXCFedeOPfmmSdj2hThEjnhjeBp4bCB0d/Af69Ea9Xd+51FCy5vg1Fik9OX1T; forterToken=967c841783384dbeaed7dfef588a6d8c_1784642641451_3263_UDF43-m4_23ck_hWN28XhFCBw%3D-6862-v2; forterToken=967c841783384dbeaed7dfef588a6d8c_1784642641451_3263_UDF43-m4_23ck_hWN28XhFCBw%3D-6862-v2; AWSALBTG=hCIpYiO4ELf5hPLZcEAUrFlprrRd/P55u3fOR5H7Gk8r2E4Qww9BcrcddZmhxoyctFwpzNNs4EC783ZAgYQkATSZIVnrbuAa/ES2Zbp6NsAGN+x+PBYE+IkgGDC43GhmL5Y+Ncv48w3NOt/X4gZ8DuPWLsvsJG/mPKe8rYZCkQBo; ttcsid=1784642643475::wsLbtQfvxyC5NmtdntbJ.20.1784646467032.0::1.3817216.3823335::2763179.26.1017.1628::4088042.204.802"

JOB_CIPHER = "022079495762869854410"

import json, re, sys, os
sys.path.insert(0, os.path.dirname(__file__))

cookies_dict = {}
for part in COOKIE_STRING.split("; "):
    if "=" in part:
        k, v = part.split("=", 1)
        cookies_dict[k] = v

print("=== Cookies Summary ===")
print(f"Total cookies: {len(cookies_dict)}")
for key in sorted(cookies_dict.keys()):
    val = cookies_dict[key]
    print(f"  {key} = {val[:60]}{'...' if len(val)>60 else ''}")

TOKENS = {k: v for k, v in cookies_dict.items() if 'token' in k.lower() or 'oauth' in k.lower()}
print(f"\n=== Auth Tokens Found ===")
for k, v in TOKENS.items():
    print(f"  {k} = {v}")

# --- Test 1: Fetch HTML page with curl_cffi ---
print(f"\n\n=== Test 1: Fetch job HTML page with curl_cffi ===")
from curl_cffi import requests as curl_requests
try:
    resp = curl_requests.get(
        f"https://www.upwork.com/jobs/~{JOB_CIPHER}/",
        cookies=cookies_dict,
        impersonate="safari17_0",
        timeout=30,
        allow_redirects=True,
    )
    print(f"Status: {resp.status_code}")
    print(f"Content-Type: {resp.headers.get('content-type', '?')}")
    print(f"Content Length: {len(resp.text)}")
    if resp.status_code == 200:
        if "__NUXT__" in resp.text:
            print("SUCCESS: __NUXT__ found in HTML!")
            start = resp.text.index("__NUXT__")
            print(f"  __NUXT__ at position {start}")
            # Extract ~500 chars around it
            print(f"  Context: ...{resp.text[max(0,start-100):start+400]}...")
        elif "window.__NUXT__" in resp.text:
            print("window.__NUXT__ found!")
        else:
            print("No __NUXT__ found. First 1000 chars:")
            print(resp.text[:1000])
    else:
        print(f"FAILED: {resp.text[:500]}")
except Exception as e:
    print(f"ERROR: {e}")

# --- Test 2: Try GraphQL query with visitor_signup_gql_token ---
print(f"\n\n=== Test 2: GraphQL with visitor_signup_gql_token ===")
VISITOR_TOKEN = cookies_dict.get("visitor_signup_gql_token", "")
if VISITOR_TOKEN:
    from curl_cffi import requests as curl_requests
    details_query = {
        "query": """
        query JobDetails($jobCiphertext: String!) {
            jobDetails(jobCiphertext: $jobCiphertext) {
                ciphertext
                title
                client {
                    ciphertext
                    name
                    recentJobOpenings(first: 5) {
                        edges {
                            node {
                                ciphertext
                                title
                                jobType
                                duration
                                status
                                openAt
                                totalBudget {
                                    amount
                                    currency
                                }
                            }
                        }
                    }
                }
            }
        }
        """,
        "variables": {"jobCiphertext": JOB_CIPHER}
    }
    headers = {
        "Content-Type": "application/json",
        "x-requested-with": "XMLHttpRequest",
        "origin": "https://www.upwork.com",
        "referer": f"https://www.upwork.com/jobs/~{JOB_CIPHER}/",
        "authorization": f"Bearer {VISITOR_TOKEN}",
    }
    try:
        resp = curl_requests.post(
            "https://www.upwork.com/api/graphql/v1",
            json=details_query,
            cookies=cookies_dict,
            headers=headers,
            impersonate="safari17_0",
            timeout=30,
        )
        print(f"Status: {resp.status_code}")
        data = resp.json()
        if "errors" in data:
            print(f"GraphQL Error: {json.dumps(data['errors'], indent=2)[:1000]}")
        elif data.get("data", {}).get("jobDetails"):
            jd = data["data"]["jobDetails"]
            client = jd.get("client", {})
            print(f"Job: {jd.get('title')}")
            print(f"Client: {client.get('name')}")
            recent = client.get("recentJobOpenings", {})
            edges = recent.get("edges", [])
            print(f"Recent job openings: {len(edges)}")
            for edge in edges:
                node = edge.get("node", {})
                print(f"  - {node.get('title')} ({node.get('status')}) budget: {node.get('totalBudget',{}).get('amount')}")
        else:
            print(f"Response: {json.dumps(data, indent=2)[:2000]}")
    except Exception as e:
        print(f"ERROR: {e}")
else:
    print("No visitor_signup_gql_token found")

# --- Test 3: Try with oauth2_global_js_token ---
print(f"\n\n=== Test 3: GraphQL with oauth2_global_js_token ===")
GLOBAL_TOKEN = cookies_dict.get("oauth2_global_js_token", "")
if GLOBAL_TOKEN:
    from curl_cffi import requests as curl_requests
    headers2 = {
        "Content-Type": "application/json",
        "x-requested-with": "XMLHttpRequest",
        "origin": "https://www.upwork.com",
        "referer": f"https://www.upwork.com/jobs/~{JOB_CIPHER}/",
        "authorization": f"Bearer {GLOBAL_TOKEN}",
    }
    try:
        resp = curl_requests.post(
            "https://www.upwork.com/api/graphql/v1",
            json=details_query,
            cookies=cookies_dict,
            headers=headers2,
            impersonate="safari17_0",
            timeout=30,
        )
        print(f"Status: {resp.status_code}")
        data = resp.json()
        if "errors" in data:
            print(f"GraphQL Error: {json.dumps(data['errors'], indent=2)[:1000]}")
        elif data.get("data", {}).get("jobDetails"):
            jd = data["data"]["jobDetails"]
            client = jd.get("client", {})
            print(f"Job: {jd.get('title')}")
            print(f"Client: {client.get('name')}")
            recent = client.get("recentJobOpenings", {})
            edges = recent.get("edges", []) if recent else []
            print(f"Recent job openings: {len(edges)}")
            for edge in edges:
                node = edge.get("node", {})
                print(f"  - {node.get('title')} ({node.get('status')})")
        else:
            print(f"Response: {json.dumps(data, indent=2)[:2000]}")
    except Exception as e:
        print(f"ERROR: {e}")

# --- Test 4: Try the simpler "job" query endpoint ---
print(f"\n\n=== Test 4: Try POST /api/abragent/job/v2 ===")
try:
    resp2 = curl_requests.get(
        f"https://www.upwork.com/api/abragent/job/v2/{JOB_CIPHER}",
        cookies=cookies_dict,
        headers={
            "x-requested-with": "XMLHttpRequest",
            "referer": f"https://www.upwork.com/jobs/~{JOB_CIPHER}/",
        },
        impersonate="safari17_0",
        timeout=30,
    )
    print(f"Status: {resp2.status_code}")
    if resp2.status_code == 200:
        txt = resp2.text[:2000]
        print(f"Response: {txt}")
    else:
        print(f"Status {resp2.status_code}: {resp2.text[:300]}")
except Exception as e:
    print(f"ERROR: {e}")

print("\n\n=== Done ===")
