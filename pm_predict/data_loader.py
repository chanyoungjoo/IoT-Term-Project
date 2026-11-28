"""1. 데이터 불러오기 / 2. DataFrame화

실행: python data_loader.py
"""
import pandas as pd

from config import DATA_DIR


# ── 1. 데이터 불러오기 ─────────────────────────────────

def check_files():
    print('air     :', len(list((DATA_DIR / 'air').glob('*/*.xls'))))
    print('weather :', len(list((DATA_DIR / 'weather').glob('*/*.xls'))))


# ── 2. DataFrame화 ─────────────────────────────────────

def preview_air_file():
    # 2022년 1월 파일 하나만 열기
    # skiprows=2 : 위 2줄(항목명, 단위)은 건너뛰기
    # header=None : 열 이름은 우리가 직접 붙일 것
    df = pd.read_excel(DATA_DIR / 'air/2022/air_2022_01.xls', skiprows=2, header=None)
    print(df.head())

    # 칼럼 이름 붙이기
    df.columns = ['날짜', 'pm10', 'pm25', 'o3', 'no2', 'co', 'so2']

    # '01-31-24' 글자를 잘라서 월, 일, 시로 나누기
    df['월'] = df['날짜'].str[0:2].astype(int)   # 앞 2글자
    df['일'] = df['날짜'].str[3:5].astype(int)   # 가운데 2글자
    df['시'] = df['날짜'].str[6:8].astype(int)   # 뒤 2글자

    # 날짜(연·월·일) + 시간 = 시각
    df['ts'] = pd.to_datetime(dict(year=2022, month=df['월'], day=df['일'])) + pd.to_timedelta(df['시'], unit='h')

    print(df[['날짜', 'ts', 'pm25']].tail(3))


# ── 2.1 대기질 데이터 모두 DataFrame화 ──────────────────

def load_air():
    air_list = []

    for f in sorted((DATA_DIR / 'air').glob('*/*.xls')):
        year = int(f.name[4:8])                   # 'air_2022_01.xls' → 2022

        df = pd.read_excel(f, skiprows=2, header=None)
        df.columns = ['날짜', 'pm10', 'pm25', 'o3', 'no2', 'co', 'so2']
        df['월'] = df['날짜'].str[0:2].astype(int)
        df['일'] = df['날짜'].str[3:5].astype(int)
        df['시'] = df['날짜'].str[6:8].astype(int)
        df['ts'] = pd.to_datetime(dict(year=year, month=df['월'], day=df['일'])) + pd.to_timedelta(df['시'], unit='h')

        air_list.append(df[['ts', 'pm25', 'pm10', 'o3', 'no2', 'co', 'so2']])   # 모든 오염물질 포함

    air = pd.concat(air_list)                       # 48개를 하나로 합치기
    air = air.sort_values('ts').reset_index(drop=True)

    print(len(air), '행 |', air['ts'].min(), '~', air['ts'].max())
    return air


# ── 2.2 기상 및 대기질 데이터 모두 DataFrame화 ───────────

def preview_weather_file():
    # 확장자는 .xls지만 실제로는 '탭으로 구분된 텍스트' 파일이라 read_csv로 읽음
    # encoding='cp949' : 한글이 깨지지 않게
    w = pd.read_csv(DATA_DIR / 'weather/2022/weather_2022_01.xls', sep='\t', encoding='cp949')
    print(w.head())


def load_weather():
    weather_list = []

    for f in sorted((DATA_DIR / 'weather').glob('*/*.xls')):
        w = pd.read_csv(f, sep='\t', encoding='cp949')
        w.columns = ['지점', '지점명', 'ts', 'temp', 'wd', 'ws', 'rain', 'pa', 'ps', 'hum']
        weather_list.append(w[['ts', 'temp', 'wd', 'ws', 'rain', 'hum']]) # 지점, 지점명은 모두 동일하므로 제외해서 추가

    weather = pd.concat(weather_list)
    weather['ts'] = pd.to_datetime(weather['ts'])       # 글자 → 시각
    weather = weather.sort_values('ts').reset_index(drop=True)

    print(len(weather), '행 |', weather['ts'].min(), '~', weather['ts'].max())
    return weather


if __name__ == '__main__':
    check_files()
    preview_air_file()
    load_air()
    preview_weather_file()
    load_weather()
