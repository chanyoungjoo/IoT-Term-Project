# 🔮 실외 PM2.5 3시간 예측 (pm_predict)

AirClass의 **사전대응**을 위한 실외 미세먼지(PM2.5) 예측 모듈이에요.
지금까지의 공기·기상 정보로 **3시간 뒤 PM2.5**를 예측해서, 나빠지기 전에 환기·공기청정기 계획을 세울 수 있게 해요.

## 데이터

| 구분 | 출처 | 기간 | 내용 |
|---|---|---|---|
| 대기질 | 에어코리아 최종확정 측정자료 (측정소 1곳) | 2022~2025, 시간별 | PM2.5, PM10, O₃, NO₂, CO, SO₂ |
| 기상 | 기상청 방재기상관측(AWS) 565 시흥 | 2022~2025, 시간별 | 기온, 풍향, 풍속, 강수, 습도 |

`iot_dataSet/air/연도/air_YYYY_MM.xls`, `iot_dataSet/weather/연도/weather_YYYY_MM.xls`에 두면 돼요. (원본 데이터는 깃에 올리지 않아요)

## 파일 구성 (Air_AI_Test.ipynb 순서)

| 파일 | 노트북 섹션 |
|---|---|
| `config.py` | 경로, H=3, BAD=36, MAX_GAP=3, FEATURES |
| `data_loader.py` | 1. 데이터 불러오기 / 2. DataFrame화 (2.1 대기질, 2.2 기상) |
| `preprocess.py` | 2.3 데이터 다듬기 및 병합 / 3.1 결측치 / 3.2 풍향 칼럼 변환 / 4.0 중간 저장 |
| `eda.py` | 4.1 EDA (그래프는 `outputs/eda/`에 저장) |
| `features.py` | 5. Feature 만들기 |
| `split.py` | 6. Train/Val/Test Split, 평가 공통 데이터 |
| `evaluate.py` | 6. 평가 함수 |
| `linear_model.py` | 기준선 + 7. Linear Regression / Ridge |

## 실행

```bash
cd pm_predict
pip install -r requirements.txt

python data_loader.py     # 불러오기 확인
python preprocess.py      # 병합·전처리 → iot_dataSet/iot_preprocessed.pkl
python eda.py             # EDA 그래프 → outputs/eda/
python linear_model.py    # 기준선·Linear Regression·Ridge 결과
```

`eda.py`와 `linear_model.py`는 `iot_preprocessed.pkl`이 없으면 전처리부터 자동으로 실행해요.

## 지금까지 결과 (Valid 2024, 3시간 예측)

| 모델 | MAE | RMSE | 큰 변화 MAE | 전환 재현율 | 전환 정밀도 |
|---|---|---|---|---|---|
| 현재값 유지 | 4.94 | 7.55 | 16.00 | 0.000 | 0.000 |
| Linear Regression | 4.74 | 7.01 | 13.98 | 0.011 | 0.429 |
| Ridge | 4.74 | 7.01 | 13.98 | 0.011 | 0.429 |

- 선형 모델은 전체 오차를 약 4% 줄이지만, **나쁨 전환은 거의 잡지 못해요**(재현율 1.1%).
- 다음 단계: LightGBM으로 비선형 관계 학습, 전환 경보 개선(기준 조정·분류 모델).

## EDA 핵심

- **ACF는 천천히 감소, PACF는 lag 1 이후 급격히 0** → AR(1)에 가까운 구조. lag 1~3 + 6·24시간 이동평균 사용
- 3월 최고(26.2), 9월 최저(12.0) / 오전 9시 최고, 오후 6시 최저 → 월·시각 sin/cos
- 풍속이 약할수록 높고, 비가 1mm 이상 오면 3시간 동안 평균 1.5 감소
- PM10·CO는 PM2.5와 상관이 높지만 **현재 PM2.5와 겹치는 정보가 대부분** → 최종 선택은 실험으로
