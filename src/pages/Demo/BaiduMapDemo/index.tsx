import React, { useEffect, useRef, useState } from 'react';
import { Card, Alert, Select, Button, message, Spin } from 'antd';
import { SearchOutlined, PlayCircleOutlined } from '@ant-design/icons';

// JSONP 请求封装，用于跨域调用腾讯地图 WebService API
let jsonpCount = 0;
function jsonpSearch(keyword: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const callbackName = `qqmap_jsonp_${Date.now()}_${++jsonpCount}`;
    const script = document.createElement('script');
    // 必须添加 region 参数，否则 suggestion 接口会报错
    script.src = `https://apis.map.qq.com/ws/place/v1/suggestion?keyword=${encodeURIComponent(keyword)}&region=${encodeURIComponent('北京')}&key=ZQBBZ-5G56B-QO6UF-JNQ6M-QGFSF-BIB5Y&output=jsonp&callback=${callbackName}`;
    
    (window as any)[callbackName] = (data: any) => {
      resolve(data);
      document.body.removeChild(script);
      delete (window as any)[callbackName];
    };
    
    script.onerror = () => {
      reject(new Error('JSONP request failed'));
      document.body.removeChild(script);
      delete (window as any)[callbackName];
    };
    
    document.body.appendChild(script);
  });
}

function jsonpGeocoder(lat: string | number, lng: string | number): Promise<any> {
  return new Promise((resolve, reject) => {
    const callbackName = `qqmap_jsonp_geo_${Date.now()}_${++jsonpCount}`;
    const script = document.createElement('script');
    // 调用逆地址解析接口 (geocoder)
    script.src = `https://apis.map.qq.com/ws/geocoder/v1/?location=${lat},${lng}&key=ZQBBZ-5G56B-QO6UF-JNQ6M-QGFSF-BIB5Y&output=jsonp&callback=${callbackName}`;
    
    (window as any)[callbackName] = (data: any) => {
      resolve(data);
      document.body.removeChild(script);
      delete (window as any)[callbackName];
    };
    
    script.onerror = () => {
      reject(new Error('JSONP geocoder request failed'));
      document.body.removeChild(script);
      delete (window as any)[callbackName];
    };
    
    document.body.appendChild(script);
  });
}

export default function TencentMapDemo() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const searchMarkerRef = useRef<any>(null);
  const animLayersRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const mapInitialized = useRef(false); // 防止 React 18 StrictMode 导致地图重复初始化
  
  const [options, setOptions] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if ((window as any).TMap) {
      initMap();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://map.qq.com/api/gljs?v=2.exp&key=ZQBBZ-5G56B-QO6UF-JNQ6M-QGFSF-BIB5Y&libraries=geometry`;
    script.async = true;
    
    script.onload = () => {
      initMap();
    };

    document.body.appendChild(script);
  }, []);

  const initMap = () => {
    if (!mapContainerRef.current || !(window as any).TMap || mapInitialized.current) return;
    
    mapInitialized.current = true;
    const TMap = (window as any).TMap;
    const center = new TMap.LatLng(39.916527, 116.397128); // 北京天安门
    
    const map = new TMap.Map(mapContainerRef.current, {
      center: center,
      zoom: 12,
      viewMode: '2D'
    });
    
    mapInstanceRef.current = map;

    // 初始化信息窗口
    const infoWindow = new TMap.InfoWindow({
      map: map,
      position: center,
      offset: { x: 0, y: -32 }
    });
    infoWindow.close();
    infoWindowRef.current = infoWindow;

    // 监听地图点击事件
    map.on('click', async (evt: any) => {
      const lat = evt.latLng.getLat().toFixed(6);
      const lng = evt.latLng.getLng().toFixed(6);

      // 1. 先在点击位置弹出一个加载中的 InfoWindow
      infoWindow.setPosition(evt.latLng);
      infoWindow.setContent(`<div style="padding: 8px; line-height: 1.5;">正在获取地址信息...<br/>纬度: ${lat}<br/>经度: ${lng}</div>`);
      infoWindow.open();

      // 2. 调用逆地址解析接口获取地名
      try {
        const res = await jsonpGeocoder(lat, lng);
        if (res && res.status === 0 && res.result) {
          const address = res.result.address;
          const formattedAddress = res.result.formatted_addresses?.recommend || address;
          
          infoWindow.setContent(`
            <div style="padding: 8px; max-width: 250px; line-height: 1.5;">
              <div style="font-weight: bold; margin-bottom: 4px; font-size: 14px;">${formattedAddress}</div>
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">详细地址: ${address}</div>
              <div style="font-size: 12px; color: #1677ff;">纬度: ${lat}</div>
              <div style="font-size: 12px; color: #1677ff;">经度: ${lng}</div>
            </div>
          `);

          // 3. 更新或添加 Marker 到点击位置
          if (searchMarkerRef.current) {
            searchMarkerRef.current.updateGeometries([{
              id: 'search-marker',
              styleId: 'default',
              position: evt.latLng,
              properties: { title: formattedAddress }
            }]);
          } else {
            const marker = new TMap.MultiMarker({
              map: map,
              styles: {
                "default": new TMap.MarkerStyle({
                  width: 25,
                  height: 35,
                  anchor: { x: 12, y: 35 },
                })
              },
              geometries: [{
                id: 'search-marker',
                styleId: 'default',
                position: evt.latLng,
                properties: { title: formattedAddress }
              }]
            });
            searchMarkerRef.current = marker;
          }
        } else {
          infoWindow.setContent(`<div style="padding: 8px; line-height: 1.5;">获取地址失败<br/>纬度: ${lat}<br/>经度: ${lng}</div>`);
        }
      } catch (error) {
        infoWindow.setContent(`<div style="padding: 8px; line-height: 1.5;">获取地址出错<br/>纬度: ${lat}<br/>经度: ${lng}</div>`);
      }
    });
  };

  const handleSearch = async (value: string) => {
    if (!value) {
      setOptions([]);
      return;
    }
    setFetching(true);
    try {
      const res = await jsonpSearch(value);
      if (res && res.status === 0 && res.data) {
        const newOptions = res.data.map((item: any) => ({
          value: item.id,
          label: `${item.title} (${item.address})`,
          location: item.location,
          title: item.title
        }));
        setOptions(newOptions);
      } else {
        message.warning(res.message || '未找到相关地点');
      }
    } catch (error) {
      console.error(error);
      message.error('搜索失败，请检查网络或 API Key 权限');
    } finally {
      setFetching(false);
    }
  };

  const handleSelect = (value: string, option: any) => {
    const mapInstance = mapInstanceRef.current;
    if (!mapInstance) {
      message.error('地图尚未加载完成');
      return;
    }
    const { lat, lng } = option.location;
    
    // 1. 弹出经纬度信息
    message.success(`📍 获取到经纬度: 纬度 ${lat}, 经度 ${lng}`);
    
    const TMap = (window as any).TMap;
    const position = new TMap.LatLng(lat, lng);
    
    // 2. 移动地图中心点并放大
    mapInstance.setCenter(position);
    mapInstance.setZoom(16);
    
    // 3. 添加或更新标记点
    if (searchMarkerRef.current) {
      searchMarkerRef.current.updateGeometries([{
        id: 'search-marker',
        styleId: 'default',
        position: position,
        properties: { title: option.title }
      }]);
    } else {
      const marker = new TMap.MultiMarker({
        map: mapInstance,
        styles: {
          "default": new TMap.MarkerStyle({
            width: 25,
            height: 35,
            anchor: { x: 12, y: 35 },
          })
        },
        geometries: [{
          id: 'search-marker',
          styleId: 'default',
          position: position,
          properties: { title: option.title }
        }]
      });
      searchMarkerRef.current = marker;
    }

    // 4. 弹出 InfoWindow
    if (infoWindowRef.current) {
      infoWindowRef.current.setPosition(position);
      infoWindowRef.current.setContent(`
        <div style="padding: 8px; max-width: 250px; line-height: 1.5;">
          <div style="font-weight: bold; margin-bottom: 4px; font-size: 14px;">${option.title}</div>
          <div style="font-size: 12px; color: #1677ff;">纬度: ${lat}</div>
          <div style="font-size: 12px; color: #1677ff;">经度: ${lng}</div>
        </div>
      `);
      infoWindowRef.current.open();
    }
  };

  const playAnimation = () => {
    const mapInstance = mapInstanceRef.current;
    if (!mapInstance) {
      message.warning('地图尚未加载完成');
      return;
    }
    const TMap = (window as any).TMap;
    
    // 清除已有的动画图层
    if (animLayersRef.current) {
      animLayersRef.current.polyline.setMap(null);
      animLayersRef.current.marker.setMap(null);
    }
    
    // 定义一条测试轨迹（北京中关村附近）
    const path = [
      new TMap.LatLng(39.98481500648338, 116.30571126937866),
      new TMap.LatLng(39.982266575222155, 116.30596876144409),
      new TMap.LatLng(39.982348784165886, 116.3111400604248),
      new TMap.LatLng(39.978813710266024, 116.3111400604248),
      new TMap.LatLng(39.978813710266024, 116.31699800491333)
    ];
    
    // 移动视角到轨迹起点
    mapInstance.setCenter(path[0]);
    mapInstance.setZoom(15);
    
    // 绘制轨迹路线
    const polyline = new TMap.MultiPolyline({
      map: mapInstance,
      styles: {
        'style_blue': new TMap.PolylineStyle({
          color: '#3777FF',
          width: 6,
          borderWidth: 2,
          borderColor: '#FFF',
          lineCap: 'round'
        })
      },
      geometries: [{
        id: 'pl_1',
        styleId: 'style_blue',
        paths: path
      }]
    });
    
    // 创建移动的小车标记（使用 SVG 避免外部图片 403 导致不显示）
    const marker = new TMap.MultiMarker({
      map: mapInstance,
      styles: {
        'car-down': new TMap.MarkerStyle({
          width: 24,
          height: 24,
          anchor: { x: 12, y: 12 },
          src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23e11d48"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4" fill="white"/></svg>'
        })
      },
      geometries: [{
        id: 'car',
        styleId: 'car-down',
        position: path[0]
      }]
    });
    
    animLayersRef.current = { polyline, marker };
    
    // 启动沿线移动动画
    marker.moveAlong({
      'car': {
        path,
        speed: 250 // 速度，单位：千米/小时
      }
    }, {
      autoRotation: true
    });
    
    message.info('🚗 轨迹动画已启动');
  };

  return (
    <div className="p-6">
      <Card title="腾讯地图 WebGL Demo" className="w-full">
        <Alert 
          title="提示：本 Demo 使用了腾讯地图 API，已配置您提供的 Key。支持地名模糊搜索、点击地图获取经纬度及地名、以及轨迹动画展示。" 
          type="info" 
          showIcon 
          className="mb-4"
        />
        
        <div className="mb-4 flex flex-col sm:flex-row gap-4">
          <Select
            showSearch
            placeholder="输入地名模糊搜索 (例如: 故宫)"
            notFoundContent={fetching ? <Spin size="small" /> : null}
            filterOption={false}
            onSearch={handleSearch}
            onSelect={handleSelect}
            style={{ width: '100%', maxWidth: '400px' }}
            options={options}
            suffixIcon={<SearchOutlined />}
          />
          
          <Button 
            type="primary" 
            icon={<PlayCircleOutlined />} 
            onClick={playAnimation}
          >
            播放轨迹动画
          </Button>
        </div>

        <div 
          ref={mapContainerRef} 
          className="w-full h-[600px] rounded-lg overflow-hidden shadow-sm border border-gray-200" 
        />
      </Card>
    </div>
  );
}
