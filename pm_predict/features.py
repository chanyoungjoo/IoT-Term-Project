"""5. Feature 만들기

학습과 예측에서 반드시 같은 함수를 사용
"""
import numpy as np

from config import H


def make_features(df):
    # H = 3   # 몇 시간 뒤를 예측할지 (config.py)

    # Target: 3시간 뒤 '실제 측정' PM2.5 (채운 값이 아닌 원본)
    df['y'] = df['target_pm25'].shift(-H)

    # (1) Past Value: shift(n) = n시간 전 값을 지금 행으로 가져오기
    for lag in [1, 2, 3]:
        df[f'pm25_lag{lag}'] = df['pm25'].shift(lag)

    # (2) Difference: Current - Past
    df['pm25_diff1'] = df['pm25'] - df['pm25'].shift(1)
    df['pm25_diff3'] = df['pm25'] - df['pm25'].shift(3)

    # (3) value of mean: rolling(n) = 지금 포함 최근 n시간
    df['pm25_mean6']  = df['pm25'].rolling(6,  min_periods=4).mean()
    df['pm25_mean24'] = df['pm25'].rolling(24, min_periods=18).mean()

    # (4) 최근 3시간 강수 합
    df['rain_3h'] = df['rain'].rolling(3, min_periods=1).sum()

    # (5) 시간 주기: sin/cos (23시와 0시, 12월과 1월이 가깝게)
    hour, month = df['ts'].dt.hour, df['ts'].dt.month
    df['hour_sin']  = np.sin(2 * np.pi * hour / 24)
    df['hour_cos']  = np.cos(2 * np.pi * hour / 24)
    df['month_sin'] = np.sin(2 * np.pi * (month - 1) / 12)
    df['month_cos'] = np.cos(2 * np.pi * (month - 1) / 12)

    return df
