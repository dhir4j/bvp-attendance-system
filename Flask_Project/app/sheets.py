import string, gspread
from google.oauth2.service_account import Credentials
from config import Config

def get_sheet():
    scope = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
    ]
    creds  = Credentials.from_service_account_file(Config.SERVICE_JSON, scopes=scope)
    client = gspread.authorize(creds)
    return client.open_by_key(Config.SHEET_KEY).worksheet('sem 3 / an sheet')

def col_letter_to_index(letter):
    return string.ascii_uppercase.index(letter) + 1

def cell_value_to_int(val):
    try:
        return int(val)
    except:
        return 0

def get_batch_rolls(batch):
    sheet    = get_sheet()
    all_rows = sheet.col_values(1)[4:71]
    headers  = [i for i,v in enumerate(all_rows) if not v.isdigit()]
    starts   = [0] + [i+1 for i in headers]
    ends     = headers + [len(all_rows)]
    if batch<1 or batch>len(starts): return []
    s,e = starts[batch-1], ends[batch-1]
    return [r for r in all_rows[s:e] if r.isdigit()]

# full sem-3 mapping from new_main.py:
subject_column_map = {
  "DMS": {"TH":{None:("D","E4")}, "PR":{1:("F","G4"),2:("F","G28"),3:("F","G52")}, "TU":{1:("H","I4"),2:("H","I28"),3:("H","I52")}},
  "DTE": {"TH":{None:("J","K4")}, "PR":{1:("L","M4"),2:("L","M28"),3:("L","M52")}},
  "DSP": {"TH":{None:("N","O4")}, "PR":{1:("P","Q4"),2:("P","Q28"),3:("P","Q52")}},
  "SML": {"TH":{None:("R","S4")}, "PR":{1:("T","U4"),2:("T","U28"),3:("T","U52")}, "TU":{1:("V","W4"),2:("V","W28"),3:("V","W52")}},
  "DST": {"TH":{None:("Z","AA4")}, "PR":{1:("AB","AC4"),2:("AB","AC28"),3:("AB","AC52")}},
  "EIC": {"TH":{None:("X","Y4")}},
}
