"""2.3 데이터 다듬기 및 병합 / 3. 데이터 전처리 / 4.0 중간 저장

실행: python preprocess.py
"""
import numpy as np
import pandas as pd

from config import MAX_GAP, PREPROCESSED_PATH
from data_loader import load_air, load_weather


# ── 2.3 데이터 다듬기 및 병합 ───────────────────────────

def check_time_diff(air, weather):
    # 위에서 확인했듯이 2개의 데이터가 2개의 행의 차이로 다른것을 확인
    # 어떤 시각이 서로 다른 것인지 확인하고 이를 처리

    # 대기질에는 있는데 기상에는 없는 시각
    print('기상에 없는 시각')
    print(air[~air['ts'].isin(weather['ts'])]['ts'])

    # 기상에는 있는데 대기질에는 없는 시각
    print('\n대기질에 없는 시각')
    print(weather[~weather['ts'].isin(air['ts'])]['ts'])


def merge(air, weather):
    # 데이터를 Merge 시킴

    # 대기질을 기준으로, 같은 시각의 기상 값을 옆에 붙이기
    # how='left' : 대기질 행은 모두 남기고, 기상이 없으면 빈칸(NaN)
    df = pd.merge(air, weather, on='ts', how='left')

    # 2026-01-01 00시는 분석 기간(2022~2025) 밖이라 제외
    df = df[df['ts'] < '2026-01-01'].reset_index(drop=True)

    print(df.shape)
    return df


# ── 3. 데이터 전처리 ────────────────────────────────────
# ── 3.1 결측치 확인 ─────────────────────────────────────

def gap_length(s):
    """각 행이 '몇 시간짜리 빈칸'에 속하는지 계산 (값이 있는 행은 0)"""
    is_na = s.isna()                                  # 빈칸이면 True
    group = (is_na != is_na.shift()).cumsum()         # True/False가 바뀔 때마다 새 묶음 번호
    return is_na.groupby(group).transform('sum')      # 묶음 안의 빈칸 개수


def fill_missing(df):
    print(df.isna().sum())

    # 예측 정답은 '실제 측정값'이어야 하므로, 채우기 전에 원본을 따로 복사
    df['target_pm25'] = df['pm25']

    # MAX_GAP = 3   # 3시간 이하 빈칸만 채움 (config.py)

    # 숫자형 변수: 앞뒤 값을 직선으로 이어서 채우기 (선형 보간)
    for col in ['pm25', 'pm10', 'o3', 'no2', 'co', 'so2', 'temp', 'ws', 'hum']:
        short = df[col].isna() & (gap_length(df[col]) <= MAX_GAP)   # 채울 위치
        filled = df[col].interpolate(limit_area='inside')            # 전체를 보간한 값
        df.loc[short, col] = filled[short]                           # 짧은 빈칸에만 넣기

    # 풍향: 각도라서 직전 값으로 채우기
    short = df['wd'].isna() & (gap_length(df['wd']) <= MAX_GAP)
    df.loc[short, 'wd'] = df['wd'].ffill()[short]

    print(df.isna().sum())
    return df


# ── 3.2 풍향 칼럼 변환 ──────────────────────────────────

def add_wind(df):
    # 풍향의 경우에는 값을 보고 정확한 방향을 모델이 파악을 하기 어렵기 때문에 sin,cos 변환을 해줌
    # 다만, sin,cos 변환만 할 경우 바람이 아예 불지 않는데 sin, cos값이 있게되면 정확하게 알수 없음
    # 그래서 바람 벡터를 추가로 같이 만들어서 df에 추가

    # 라디안으로 변환 (sin, cos 함수는 라디안을 받음)
    rad = np.deg2rad(df['wd'])

    # (1) 방향만: 원 위의 위치
    df['wd_sin'] = np.sin(rad)   # +1 동쪽 ~ −1 서쪽
    df['wd_cos'] = np.cos(rad)   # +1 북쪽 ~ −1 남쪽

    # (2) 풍속까지 반영한 바람 벡터 (바람이 약하면 0에 가까움)
    df['wind_u'] = df['ws'] * df['wd_sin']   # 동서 성분 (− 이면 서풍)
    df['wind_v'] = df['ws'] * df['wd_cos']   # 남북 성분

    print(df[['ts', 'wd', 'ws', 'wd_sin', 'wd_cos', 'wind_u', 'wind_v']].head())
    return df


# ── 4.0 지금까지 변수 중간 저장 ─────────────────────────

def save(df):
    # 전처리 결과 저장
    df.to_pickle(PREPROCESSED_PATH)
    print('저장 완료:', len(df), '행')


def load_preprocessed():
    # 다음에 불러올 때 (저장된 파일이 없으면 전처리부터 실행)
    if PREPROCESSED_PATH.exists():
        return pd.read_pickle(PREPROCESSED_PATH)
    return build()


def build():
    air, weather = load_air(), load_weather()
    check_time_diff(air, weather)
    df = merge(air, weather)
    df = fill_missing(df)
    df = add_wind(df)
    save(df)
    return df


if __name__ == '__main__':
    build()
