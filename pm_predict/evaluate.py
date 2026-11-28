"""6. 평가 함수 (모든 모델에 공통)"""
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error

from config import BAD   # BAD = 36   # 나쁨 기준


def evaluate(name, d, pred):
    """모델 이름, 평가 데이터, 예측값 → 지표 한 줄"""
    y    = d['y'].values          # 정답: 3시간 뒤 실제 값
    now  = d['pm25'].values       # 지금 값
    pred = np.asarray(pred)

    # ① 전체 오차
    mae  = mean_absolute_error(y, pred)            # 평균적으로 몇 만큼 틀리나
    rmse = mean_squared_error(y, pred) ** 0.5      # 크게 틀린 경우에 더 벌점

    # ② 크게 변한 구간(3시간 동안 ±10 이상)에서의 오차 → 모델 실력이 드러나는 곳
    big = np.abs(y - now) >= 10
    mae_big = mean_absolute_error(y[big], pred[big])

    # ③ 나쁨 전환: 지금은 괜찮은데(36 미만) 3시간 뒤 나쁨(36 이상)이 되는 경우
    turn  = (now < BAD) & (y >= BAD)               # 실제로 전환된 경우
    alarm = (now < BAD) & (pred >= BAD)            # 모델이 "나빠진다"고 예측한 경우
    recall    = (turn & alarm).sum() / turn.sum()                        # 실제 전환 중 몇 %를 잡았나
    precision = (turn & alarm).sum() / alarm.sum() if alarm.sum() else 0  # 경보 중 몇 %가 맞았나

    return {'모델': name, 'MAE': round(mae, 2), 'RMSE': round(rmse, 2),
            '큰 변화 MAE': round(mae_big, 2),
            '전환 재현율': round(recall, 3), '전환 정밀도': round(precision, 3)}
