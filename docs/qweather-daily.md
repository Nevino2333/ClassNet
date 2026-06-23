## 每日天气预报

平台: [API](https://dev.qweather.com/docs/api/weather/weather-daily-forecast/) [iOS](https://dev.qweather.com/docs/ios-sdk/weather/ios-weather-daily-forecast/) [Android](https://dev.qweather.com/docs/android-sdk/weather/android-weather-daily-forecast/)

每日天气预报API，提供全球城市未来3-30天天气预报，包括：日出日落、月升月落、最高最低温度、天气白天和夜间状况、风力、风速、风向、相对湿度、大气压强、降水量、露点温度、紫外线强度、能见度等。

## 请求路径

```
/v7/weather/{days}
```

## 参数

#### 路径参数

- `days` (必选)预报天数，支持最多30天预报，可选值：
	- `3d` 3天预报。
		- `7d` 7天预报。
		- `10d` 10天预报。
		- `15d` 15天预报。
		- `30d` 30天预报。

#### 查询参数

- `location` (必选)需要查询地区的 [LocationID](https://dev.qweather.com/docs/resource/glossary/#locationid) 或以英文逗号分隔的 [经度,纬度坐标](https://dev.qweather.com/docs/resource/glossary/#coordinate) （十进制，最多支持小数点后两位），LocationID可通过 [GeoAPI](https://dev.qweather.com/docs/api/geoapi/) 获取。例如 `location=101010100` 或 `location=116.41,39.92`
- `lang` 多语言设置，请阅读 [多语言](https://dev.qweather.com/docs/resource/language/) 文档，了解我们的多语言是如何工作、如何设置以及数据是否支持多语言。
- `unit` 数据单位设置，可选值包括 `unit=m` （公制单位，默认）和 `unit=i` （英制单位）。更多选项和说明参考 [度量衡单位](https://dev.qweather.com/docs/resource/unit) 。

## 请求示例

```bash
curl -X GET --compressed \
-H 'Authorization: Bearer your_token' \
'https://your_api_host/v7/weather/3d?location=101010100'
```

请将 `your_token` 替换为你的 [JWT身份认证](https://dev.qweather.com/docs/configuration/authentication/) ，将 `your_api_host` 替换为你的 [API Host](https://dev.qweather.com/docs/configuration/api-host/)

## 返回数据

返回数据是JSON格式并进行了 [Gzip压缩](https://dev.qweather.com/docs/best-practices/gzip/) 。

```json
{
  "code": "200",
  "updateTime": "2021-11-15T16:35+08:00",
  "fxLink": "http://hfx.link/2ax1",
  "daily": [
    {
      "fxDate": "2021-11-15",
      "sunrise": "06:58",
      "sunset": "16:59",
      "moonrise": "15:16",
      "moonset": "03:40",
      "moonPhase": "盈凸月",
      "moonPhaseIcon": "803",
      "tempMax": "12",
      "tempMin": "-1",
      "iconDay": "101",
      "textDay": "多云",
      "iconNight": "150",
      "textNight": "晴",
      "wind360Day": "45",
      "windDirDay": "东北风",
      "windScaleDay": "1-2",
      "windSpeedDay": "3",
      "wind360Night": "0",
      "windDirNight": "北风",
      "windScaleNight": "1-2",
      "windSpeedNight": "3",
      "humidity": "65",
      "precip": "0.0",
      "pressure": "1020",
      "vis": "25",
      "cloud": "4",
      "uvIndex": "3"
    },
    {
      "fxDate": "2021-11-16",
      "sunrise": "07:00",
      "sunset": "16:58",
      "moonrise": "15:38",
      "moonset": "04:40",
      "moonPhase": "盈凸月",
      "moonPhaseIcon": "803",
      "tempMax": "13",
      "tempMin": "0",
      "iconDay": "100",
      "textDay": "晴",
      "iconNight": "101",
      "textNight": "多云",
      "wind360Day": "225",
      "windDirDay": "西南风",
      "windScaleDay": "1-2",
      "windSpeedDay": "3",
      "wind360Night": "225",
      "windDirNight": "西南风",
      "windScaleNight": "1-2",
      "windSpeedNight": "3",
      "humidity": "74",
      "precip": "0.0",
      "pressure": "1016",
      "vis": "25",
      "cloud": "1",
      "uvIndex": "3"
    },
    {
      "fxDate": "2021-11-17",
      "sunrise": "07:01",
      "sunset": "16:57",
      "moonrise": "16:01",
      "moonset": "05:41",
      "moonPhase": "盈凸月",
      "moonPhaseIcon": "803",
      "tempMax": "13",
      "tempMin": "0",
      "iconDay": "100",
      "textDay": "晴",
      "iconNight": "150",
      "textNight": "晴",
      "wind360Day": "225",
      "windDirDay": "西南风",
      "windScaleDay": "1-2",
      "windSpeedDay": "3",
      "wind360Night": "225",
      "windDirNight": "西南风",
      "windScaleNight": "1-2",
      "windSpeedNight": "3",
      "humidity": "56",
      "precip": "0.0",
      "pressure": "1009",
      "vis": "25",
      "cloud": "0",
      "uvIndex": "3"
    }
  ],
  "refer": {
    "sources": [
      "QWeather",
      "NMC",
      "ECMWF"
    ],
    "license": [
      "QWeather Developers License"
    ]
  }
}
```

- `code` 请参考 [状态码](https://dev.qweather.com/docs/resource/status-code/)
- `updateTime` 当前 [API的最近更新时间](https://dev.qweather.com/docs/resource/glossary/#update-time)
- `fxLink` 当前数据的响应式页面，便于嵌入网站或应用
- `daily.fxDate` 预报日期
- `daily.sunrise` [日出时间](https://dev.qweather.com/docs/resource/sun-moon-info/#sunrise-and-sunset) ， **在高纬度地区可能为空**
- `daily.sunset` [日落时间](https://dev.qweather.com/docs/resource/sun-moon-info/#sunrise-and-sunset) ， **在高纬度地区可能为空**
- `daily.moonrise` 当天 [月升时间](https://dev.qweather.com/docs/resource/sun-moon-info/#moonrise-and-moonset) ， **可能为空**
- `daily.moonset` 当天 [月落时间](https://dev.qweather.com/docs/resource/sun-moon-info/#moonrise-and-moonset) ， **可能为空**
- `daily.moonPhase` [月相名称](https://dev.qweather.com/docs/resource/sun-moon-info/#moon-phase)
- `daily.moonPhaseIcon` 月相 [图标代码](https://dev.qweather.com/docs/resource/icons/) ，另请参考 [天气图标项目](https://icons.qweather.com/)
- `daily.tempMax` 预报当天最高温度
- `daily.tempMin` 预报当天最低温度
- `daily.iconDay` 预报白天天气状况的 [图标代码](https://dev.qweather.com/docs/resource/icons/) ，另请参考 [天气图标项目](https://icons.qweather.com/)
- `daily.textDay` 预报白天天气状况文字描述，包括阴晴雨雪等天气状态的描述
- `daily.iconNight` 预报夜间天气状况的 [图标代码](https://dev.qweather.com/docs/resource/icons/) ，另请参考 [天气图标项目](https://icons.qweather.com/)
- `daily.textNight` 预报晚间天气状况文字描述，包括阴晴雨雪等天气状态的描述
- `daily.wind360Day` 预报白天 [风向](https://dev.qweather.com/docs/resource/wind-info/#wind-direction) 360角度
- `daily.windDirDay` 预报白天 [风向](https://dev.qweather.com/docs/resource/wind-info/#wind-direction)
- `daily.windScaleDay` 预报白天 [风力等级](https://dev.qweather.com/docs/resource/wind-info/#wind-scale)
- `daily.windSpeedDay` 预报白天 [风速](https://dev.qweather.com/docs/resource/wind-info/#wind-speed) ，公里/小时
- `daily.wind360Night` 预报夜间 [风向](https://dev.qweather.com/docs/resource/wind-info/#wind-direction) 360角度
- `daily.windDirNight` 预报夜间当天 [风向](https://dev.qweather.com/docs/resource/wind-info/#wind-direction)
- `daily.windScaleNight` 预报夜间 [风力等级](https://dev.qweather.com/docs/resource/wind-info/#wind-scale)
- `daily.windSpeedNight` 预报夜间 [风速](https://dev.qweather.com/docs/resource/wind-info/#wind-speed) ，公里/小时
- `daily.precip` 预报当天总降水量，默认单位：毫米
- `daily.uvIndex` 紫外线强度指数
- `daily.humidity` 相对湿度，百分比数值
- `daily.pressure` 大气压强，默认单位：百帕
- `daily.vis` 能见度，默认单位：公里
- `daily.cloud` 云量，百分比数值。 **可能为空**
- `refer.sources` 原始数据来源，或数据源说明， **可能为空**
- `refer.license` 数据许可或版权声明， **可能为空**