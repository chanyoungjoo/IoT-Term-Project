"""7. Linear Regression (기준선 포함)

실행: python linear_model.py
"""
import pandas as pd
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.preprocessing import StandardScaler

from config import FEATURES
from evaluate import evaluate
from features import make_features
from preprocess import load_preprocessed
from split import common_rows, split_data


def run():
    df = make_features(load_preprocessed())
    train, valid, test = split_data(df)
    train_c, valid_c = common_rows(train, valid)

    results = []   # 모델별 결과를 여기에 모아서 비교

    # 기준선: 3시간 뒤도 지금과 같다
    results.append(evaluate('현재값 유지', valid_c, valid_c['pm25']))

    # (1) Scaling: 변수마다 단위가 달라서 평균 0, 표준편차 1로 맞춤
    #    fit은 반드시 train으로만 → valid의 정보가 새지 않게
    scaler = StandardScaler()
    X_train = scaler.fit_transform(train_c[FEATURES])   # train으로 평균·표준편차 계산 + 변환
    X_valid = scaler.transform(valid_c[FEATURES])       # train 기준으로 변환만
    y_train = train_c['y']

    # (2) Linear Regression
    lr = LinearRegression()
    lr.fit(X_train, y_train)
    results.append(evaluate('Linear Regression', valid_c, lr.predict(X_valid)))

    # (3) Ridge: 계수가 너무 커지지 않게 누르는 선형 회귀
    # 변수가 서로 비슷할때 유용
    ridge = Ridge(alpha=10)
    ridge.fit(X_train, y_train)
    results.append(evaluate('Ridge', valid_c, ridge.predict(X_valid)))

    print(pd.DataFrame(results))
    return pd.DataFrame(results)


if __name__ == '__main__':
    run()
