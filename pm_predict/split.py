"""6. Train/Val/Test Split"""
import pandas as pd

from config import FEATURES, H


def split_data(df):
    # H = 3 (config.py)

    # (1) Target이 없는 행 제외 (3시간 뒤 값이 결측이거나, 데이터 끝부분)
    data = df.dropna(subset=['y']).copy()

    # (2) Target's TimeStamp = 지금 + 3시간
    data['y_ts'] = data['ts'] + pd.Timedelta(hours=H)

    # (3) Split: Target TimeStamp가 다음 구간으로 넘어가는 행은 제외
    train = data[data['y_ts'] < '2024-01-01']
    valid = data[(data['ts'] >= '2024-01-01') & (data['y_ts'] < '2025-01-01')]
    test  = data[data['ts'] >= '2025-01-01']

    for name, d in [('train', train), ('valid', valid), ('test', test)]:
        print(f"{name:5s} {len(d):6,}행 | {d['ts'].min()} ~ {d['ts'].max()} "
              f"| 나쁨 비율 {(d['y'] >= 36).mean():.1%} | 특징에 빈칸 있는 행 {d[FEATURES].isna().any(axis=1).sum()}")

    return train, valid, test


def common_rows(train, valid):
    # 평가에 공통으로 쓰일 데이터

    # 모든 모델이 같은 행으로 학습·평가하도록, 특징에 빈칸 없는 행만 사용
    train_c = train.dropna(subset=FEATURES)
    valid_c = valid.dropna(subset=FEATURES)
    print('train', len(train_c), '/ valid', len(valid_c))
    return train_c, valid_c
