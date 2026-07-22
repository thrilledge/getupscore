#!/usr/bin/env python3
import json
d = {
    "visitor_id": "202.66.180.110.1782158056772000",
    "tatari-session-cookie": "cc2a5188-e441-7f60-9f2d-5e31079207fb",
    "tkbl_session": "ffecdb13-898c-46b2-a1a1-cd30971aafb1",
    "XSRF-TOKEN": "CW4a3wkKbgPKsu0QVAsWUH9ahIYymMiw",
    "oauth2_global_js_token": "oauth2v2_int_60c3ee9fc1a6618e17f3ca8dcda317d7",
    "visitor_signup_gql_token": "oauth2v2_int_86edecb1a9634cb94ec0501a785b8c9f",
    "JobDetailsNuxt_vt": "oauth2v2_int_11ef94d5eb074a812ddf59ab8d7a7b8e",
    "_cq_session": "26.1784710989529.x1tTs1MxSUa3MZGh.1784711860860"
}
with open("/app/upwork_cookies.json", "w") as f:
    json.dump(d, f, indent=2)
print("Cookies written OK")
