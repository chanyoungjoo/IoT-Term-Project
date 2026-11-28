"""공통 설정 (Air_AI_Test.ipynb 기준)"""
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / 'iot_dataSet'                      # 데이터 폴더 위치
PREPROCESSED_PATH = DATA_DIR / 'iot_preprocessed.pkl'    # 전처리 결과 저장 위치
EDA_DIR = BASE_DIR / 'outputs' / 'eda'                   # EDA 그래프 저장 위치

H = 3          # 몇 시간 뒤를 예측할지
BAD = 36       # 나쁨 기준
MAX_GAP = 3    # 3시간 이하 빈칸만 채움

FEATURES = [
    'pm25', 'pm25_lag1', 'pm25_lag2', 'pm25_lag3',
    'pm25_diff1', 'pm25_diff3', 'pm25_mean6', 'pm25_mean24',
    'pm10', 'co', 'no2', 'o3', 'so2',
    'temp', 'hum', 'ws', 'wind_u', 'wind_v', 'wd_sin', 'wd_cos', 'rain', 'rain_3h',
    'hour_sin', 'hour_cos', 'month_sin', 'month_cos',
]
