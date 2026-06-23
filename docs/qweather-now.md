## 实时天气

平台: [API](https://dev.qweather.com/docs/api/weather/weather-now/) [iOS](https://dev.qweather.com/docs/ios-sdk/weather/ios-weather-now/) [Android](https://dev.qweather.com/docs/android-sdk/weather/android-weather-now/)

获取中国3000+市县区和海外20万个城市实时天气数据，包括实时温度、体感温度、风力风向、相对湿度、大气压强、降水量、能见度、露点温度、云量等。

> **注意：** 实况数据均为近实时数据，相比真实的物理世界有5-20分钟的延迟，请根据实况数据中的 `obsTime` 确定数据对应的准确时间。

## 请求路径

```
/v7/weather/now
```

## 参数

#### 查询参数

- `location` (必选)需要查询地区的 [LocationID](https://dev.qweather.com/docs/resource/glossary/#locationid) 或以英文逗号分隔的 [经度,纬度坐标](https://dev.qweather.com/docs/resource/glossary/#coordinate) （十进制，最多支持小数点后两位），LocationID可通过 [GeoAPI](https://dev.qweather.com/docs/api/geoapi/) 获取。例如 `location=101010100` 或 `location=116.41,39.92`
- `lang` 多语言设置，请阅读 [多语言](https://dev.qweather.com/docs/resource/language/) 文档，了解我们的多语言是如何工作、如何设置以及数据是否支持多语言。
- `unit` 数据单位设置，可选值包括 `unit=m` （公制单位，默认）和 `unit=i` （英制单位）。更多选项和说明参考 [度量衡单位](https://dev.qweather.com/docs/resource/unit) 。

## 请求示例

```bash
curl -X GET --compressed \
-H 'Authorization: Bearer your_token' \
'https://your_api_host/v7/weather/now?location=101010100'
```

请将 `your_token` 替换为你的 [JWT身份认证](https://dev.qweather.com/docs/configuration/authentication/) ，将 `your_api_host` 替换为你的 [API Host](https://dev.qweather.com/docs/configuration/api-host/)

## 返回数据

返回数据是JSON格式并进行了 [Gzip压缩](https://dev.qweather.com/docs/best-practices/gzip/) 。

```json
{
  "code": "200",
  "updateTime": "2020-06-30T22:00+08:00",
  "fxLink": "http://hfx.link/2ax1",
  "now": {
    "obsTime": "2020-06-30T21:40+08:00",
    "temp": "24",
    "feelsLike": "26",
    "icon": "101",
    "text": "多云",
    "wind360": "123",
    "windDir": "东南风",
    "windScale": "1",
    "windSpeed": "3",
    "humidity": "72",
    "precip": "0.0",
    "pressure": "1003",
    "vis": "16",
    "cloud": "10",
    "dew": "21"
  },
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
- `now.obsTime` 数据观测时间
- `now.temp` 温度，默认单位：摄氏度
- `now.feelsLike` 体感温度，默认单位：摄氏度
- `now.icon` 天气状况的 [图标代码](https://dev.qweather.com/docs/resource/icons/) ，另请参考 [天气图标项目](https://icons.qweather.com/)
- `now.text` 天气状况的文字描述，包括阴晴雨雪等天气状态的描述
- `now.wind360` [风向](https://dev.qweather.com/docs/resource/wind-info/#wind-direction) 360角度
- `now.windDir` [风向](https://dev.qweather.com/docs/resource/wind-info/#wind-direction)
- `now.windScale` [风力等级](https://dev.qweather.com/docs/resource/wind-info/#wind-scale)
- `now.windSpeed` [风速](https://dev.qweather.com/docs/resource/wind-info/#wind-speed) ，公里/小时
- `now.humidity` 相对湿度，百分比数值
- `now.precip` 过去1小时降水量，默认单位：毫米
- `now.pressure` 大气压强，默认单位：百帕
- `now.vis` 能见度，默认单位：公里
- `now.cloud` 云量，百分比数值。 **可能为空**
- `now.dew` 露点温度。 **可能为空**
- `refer.sources` 原始数据来源，或数据源说明， **可能为空**
- `refer.license` 数据许可或版权声明， **可能为空**