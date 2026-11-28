"""4.1 EDA

실행: python eda.py
- 노트북의 plt.show() 대신 show('파일명')으로 outputs/eda/ 에 그래프를 저장
"""
import matplotlib

matplotlib.use('Agg')                    # 창을 띄우지 않고 파일로만 저장
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from config import EDA_DIR
from preprocess import load_preprocessed

# 그래프에서 한글이 깨지지 않게 (pip install koreanize-matplotlib)
try:
    import koreanize_matplotlib  # noqa: F401
except ImportError:
    plt.rcParams['font.family'] = 'AppleGothic'
    plt.rcParams['axes.unicode_minus'] = False


def show(name):
    """노트북의 plt.show() 대신: outputs/eda/ 에 저장"""
    EDA_DIR.mkdir(parents=True, exist_ok=True)
    plt.savefig(EDA_DIR / name, dpi=120, bbox_inches='tight')
    plt.close('all')
    print('  저장:', EDA_DIR / name)


def daily_timeseries(df):
    # 하루 평균으로 줄여서 4년 흐름 보기 (1시간 단위 그대로는 너무 빽빽함)
    daily = df.set_index('ts')['target_pm25'].resample('D').mean()

    plt.figure(figsize=(14, 4))
    plt.plot(daily.index, daily.values, linewidth=0.8)
    plt.axhline(36, color='red', linestyle='--', label='나쁨 기준 (36)')
    plt.title('일평균 PM2.5 (2022~2025)')
    plt.ylabel('PM2.5 (㎍/㎥)')
    plt.legend()
    show('01_daily.png')


def yearly_timeseries(df):
    # 일평균 PM2.5 계산
    daily = df.set_index('ts')['target_pm25'].resample('D').mean().to_frame('pm25')
    daily['year'] = daily.index.year

    # 연도별로 한 줄씩 그래프
    years = sorted(daily['year'].unique())

    fig, axes = plt.subplots(len(years), 1, figsize=(14, 2.6 * len(years)), sharey=True)   # sharey: y축 범위 통일

    for ax, year in zip(axes, years):
        g = daily[daily['year'] == year]
        ax.plot(g.index, g['pm25'], linewidth=0.8)
        ax.axhline(36, color='red', linestyle='--', linewidth=0.8)    # 나쁨 기준선
        bad_days = (g['pm25'] >= 36).sum()                           # 일평균 기준 나쁨 일수
        ax.set_title(f'{year}년  (평균 {g["pm25"].mean():.1f}, 나쁨 {bad_days}일)', loc='left')
        ax.set_ylabel('PM2.5')

    plt.tight_layout()
    show('02_yearly.png')


def cycles(df):
    fig, axes = plt.subplots(1, 3, figsize=(16, 4))

    # ① 월별 평균 → 계절성
    monthly = df.groupby(df['ts'].dt.month)['target_pm25'].mean()
    axes[0].bar(monthly.index, monthly.values)
    axes[0].set_title('월별 평균 PM2.5')
    axes[0].set_xlabel('월')
    axes[0].set_xticks(range(1, 13))

    # ② 시간대별 평균 → 하루 주기
    hourly = df.groupby(df['ts'].dt.hour)['target_pm25'].mean()
    axes[1].plot(hourly.index, hourly.values, marker='o')
    axes[1].set_title('시간대별 평균 PM2.5')
    axes[1].set_xlabel('시')
    axes[1].set_xticks(range(0, 24, 3))

    # ③ 요일별 평균 → 주간 패턴 (0=월 ~ 6=일)
    weekday = df.groupby(df['ts'].dt.dayofweek)['target_pm25'].mean()
    axes[2].bar(['월', '화', '수', '목', '금', '토', '일'], weekday.values)
    axes[2].set_title('요일별 평균 PM2.5')

    for ax in axes:
        ax.set_ylabel('PM2.5 (㎍/㎥)')
    plt.tight_layout()
    show('03_cycles.png')


def season_hourly(df):
    # 계절별로 확인 (전체 계절 평균)
    season_map = {12: '겨울', 1: '겨울', 2: '겨울', 3: '봄', 4: '봄', 5: '봄',
                  6: '여름', 7: '여름', 8: '여름', 9: '가을', 10: '가을', 11: '가을'}
    df['season'] = df['ts'].dt.month.map(season_map)

    # 행: 시각, 열: 계절, 값: 평균 PM2.5
    pivot = df.pivot_table(index=df['ts'].dt.hour, columns='season', values='target_pm25')

    pivot[['봄', '여름', '가을', '겨울']].plot(figsize=(10, 4), marker='.')
    plt.title('계절별 시간대 평균 PM2.5')
    plt.xlabel('시')
    plt.ylabel('PM2.5 (㎍/㎥)')
    plt.xticks(range(0, 24, 3))
    show('04_season_hourly.png')


def year_season_table(df):
    # 연도별 계절 평균 확인
    # 표 형태로 확인
    season_map = {12: '겨울', 1: '겨울', 2: '겨울', 3: '봄', 4: '봄', 5: '봄',
                  6: '여름', 7: '여름', 8: '여름', 9: '가을', 10: '가을', 11: '가을'}
    df['season'] = df['ts'].dt.month.map(season_map)

    # 행: 연도, 열: 계절, 값: 평균 PM2.5
    year_season = df.pivot_table(index=df['ts'].dt.year, columns='season',
                                 values='target_pm25', aggfunc='mean')
    year_season = year_season[['봄', '여름', '가을', '겨울']]     # 계절 순서 맞추기
    print(year_season.round(1))


def year_season_timeseries(df):
    season_map = {12: '겨울', 1: '겨울', 2: '겨울', 3: '봄', 4: '봄', 5: '봄',
                  6: '여름', 7: '여름', 8: '여름', 9: '가을', 10: '가을', 11: '가을'}

    # 일평균 PM2.5
    daily = df.set_index('ts')['target_pm25'].resample('D').mean().to_frame('pm25')
    daily['season'] = daily.index.month.map(season_map)

    # 이름표: 봄·여름·가을은 연도 그대로, 겨울은 '12월~2월'을 하나로 묶어 '2022-23'처럼
    daily['label'] = daily.index.year.astype(str)
    winter = daily['season'] == '겨울'
    start_year = daily.index.year - (daily.index.month <= 2)          # 1·2월은 전년도 겨울에 포함
    daily.loc[winter, 'label'] = start_year[winter].astype(str) + '-' + (start_year[winter] + 1).astype(str).str[2:]

    # 계절 시작일부터 며칠째인지
    daily['day'] = daily.groupby(['season', 'label']).cumcount()
    counts = daily.groupby(['season', 'label']).size()               # 계절별 일수

    fig, axes = plt.subplots(2, 2, figsize=(15, 8), sharey=True)
    for ax, s in zip(axes.flat, ['봄', '여름', '가을', '겨울']):
        for label, g in daily[daily['season'] == s].groupby('label'):
            if counts[(s, label)] < 85:        # 일부만 있는 겨울(2021-22, 2025-26)은 제외
                continue
            smooth = g['pm25'].rolling(3, center=True, min_periods=1).mean()   # 3일 이동평균
            ax.plot(g['day'], smooth, label=label, linewidth=1)
        ax.axhline(36, color='red', linestyle='--', linewidth=0.8)
        ax.set_title(s)
        ax.set_xlabel('계절 시작 후 일수')
        ax.legend()

    plt.tight_layout()
    show('05_year_season.png')


def distribution(df):
    # 분포도 확인

    pm = df['target_pm25'].dropna()

    fig, axes = plt.subplots(1, 2, figsize=(14, 4))

    # ① 원래 값의 분포
    axes[0].hist(pm, bins=80)
    axes[0].axvline(36, color='red', linestyle='--', label='나쁨 (36)')
    axes[0].set_title(f'PM2.5 분포 (왜도 {pm.skew():.2f})')
    axes[0].set_xlabel('PM2.5')
    axes[0].legend()

    # ② 3시간 동안의 변화량 분포 (변화량 예측을 할 경우의 정답)
    change = (df['target_pm25'].shift(-3) - df['target_pm25']).dropna()
    axes[1].hist(change, bins=100, range=(-40, 40))
    axes[1].set_title('3시간 변화량 분포')
    axes[1].set_xlabel('3시간 뒤 - 지금')

    plt.tight_layout()
    show('06_distribution.png')

    print(pm.describe().round(1))
    print(f'나쁨(36↑) {(pm >= 36).mean():.1%} | 매우 나쁨(76↑) {(pm >= 76).mean():.1%}')
    print(f'3시간 동안 ±10 이상 변한 비율 {(change.abs() >= 10).mean():.1%}')


def acf(df):
    from statsmodels.graphics.tsaplots import plot_acf

    plot_acf(df['pm25'].dropna(), lags=48)   # PACF와 같은 데이터, 같은 방식
    plt.title('PM2.5 자기상관 (ACF)')
    plt.xlabel('몇 시간 전')
    show('07_acf.png')


def pacf_(df):
    # PACF도 확인

    from statsmodels.graphics.tsaplots import plot_pacf
    from statsmodels.tsa.stattools import pacf

    # PACF는 빈칸이 있으면 계산이 안 돼서, 짧은 빈칸 채운 pm25에서 남은 NaN만 빼고 사용
    s = df['pm25'].dropna()

    plot_pacf(s, lags=48, method='ywm', alpha=0.05)
    plt.title('PM2.5 편자기상관 (PACF)')
    plt.xlabel('몇 시간 전')
    plt.ylim(-0.1, 1)
    show('08_pacf.png')

    values = pacf(s, nlags=48, method='ywm')
    print(pd.Series(values[[1, 2, 3, 4, 5, 6, 12, 24, 25, 48]],
              index=[1, 2, 3, 4, 5, 6, 12, 24, 25, 48]).round(3))


def jumps(df):
    jump = (df['target_pm25'].shift(-1) - df['target_pm25']).abs()   # 1시간 변화 크기
    print('1시간에 40 이상 변한 횟수:', (jump >= 40).sum())

    # 가장 큰 급변 구간 앞뒤 보기
    i = jump.idxmax()
    print(df.loc[i-3:i+3, ['ts', 'target_pm25', 'pm10', 'co', 'no2']])


def weather_relation(df):
    # 기상과의 관계성 확인

    # 3시간 뒤 변화량 (기상이 '앞으로의 변화'에 영향을 주는지 보기 위해)
    df['chg3'] = df['target_pm25'].shift(-3) - df['target_pm25']

    # ① 풍향 8방위로 묶기 (바람이 거의 없을 때(0.5m/s 미만)는 방향 의미가 없어서 제외)
    dirs = ['북', '북동', '동', '남동', '남', '남서', '서', '북서']
    windy = df[df['ws'] >= 0.5].copy()
    windy['방위'] = pd.cut((windy['wd'] + 22.5) % 360, bins=range(0, 361, 45), labels=dirs, right=False)

    # ② 풍속 구간
    df['풍속구간'] = pd.cut(df['ws'], [-0.1, 0.5, 1, 2, 3, 4, 20],
                           labels=['~0.5', '0.5~1', '1~2', '2~3', '3~4', '4~'])

    # ③ 강수 구간
    df['강수구간'] = pd.cut(df['rain'], [-0.1, 0, 1, 5, 200], labels=['없음', '~1', '1~5', '5~'])

    # ④ 습도 구간
    df['습도구간'] = pd.cut(df['hum'], [0, 40, 60, 80, 90, 101], labels=['~40', '40~60', '60~80', '80~90', '90~'])

    fig, axes = plt.subplots(1, 4, figsize=(20, 4))
    windy.groupby('방위', observed=True)['target_pm25'].mean().plot.bar(ax=axes[0], title='풍향별 평균 PM2.5')
    df.groupby('풍속구간', observed=True)['target_pm25'].mean().plot.bar(ax=axes[1], title='풍속별 평균 PM2.5')
    df.groupby('강수구간', observed=True)['chg3'].mean().plot.bar(ax=axes[2], title='강수별 3시간 뒤 변화량')
    df.groupby('습도구간', observed=True)['target_pm25'].mean().plot.bar(ax=axes[3], title='습도별 평균 PM2.5')
    for ax in axes:
        ax.tick_params(axis='x', rotation=0)
    plt.tight_layout()
    show('09_weather.png')


def pollutant_corr(df):
    # 오염물질이 어떤 영향을 미치는가?
    # 오염물질에 대한 상관관계를 확인

    cols = ['target_pm25', 'pm10', 'co', 'no2', 'o3', 'so2']

    # ① 같은 시각끼리의 상관 (변수들이 서로 얼마나 비슷하게 움직이나)
    corr = df[cols].corr()

    plt.figure(figsize=(7, 6))
    plt.imshow(corr, cmap='RdBu_r', vmin=-1, vmax=1)       # 빨강: +, 파랑: −
    plt.colorbar(label='상관계수')
    plt.xticks(range(len(cols)), cols, rotation=45)
    plt.yticks(range(len(cols)), cols)
    for i in range(len(cols)):                            # 칸마다 숫자 표시
        for j in range(len(cols)):
            plt.text(j, i, f'{corr.iloc[i, j]:.2f}', ha='center', va='center', fontsize=9)
    plt.title('오염물질 상관 (같은 시각)')
    plt.tight_layout()
    show('10_pollutants.png')

    # ② 지금 값과 '3시간 뒤 PM2.5'의 상관 (예측에 쓸모 있는가)
    future = df['target_pm25'].shift(-3)
    print(df[cols].corrwith(future).round(3).sort_values(ascending=False))


if __name__ == '__main__':
    df = load_preprocessed()
    for fn in [daily_timeseries, yearly_timeseries, cycles, season_hourly, year_season_table,
               year_season_timeseries, distribution, acf, pacf_, jumps, weather_relation, pollutant_corr]:
        print(f'\n[{fn.__name__}]')
        fn(df.copy())
