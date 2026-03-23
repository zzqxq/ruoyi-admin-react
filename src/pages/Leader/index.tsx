import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { geoMercator, geoCentroid } from 'd3-geo';
import { Button, Spin, message } from 'antd';
import { RollbackOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useNavigate } from 'react-router-dom';

/**
 * 可视化大屏（全国/省/市/区县下钻）
 *
 * 功能概览：
 * 1) Three.js 绘制 3D 挤出地图（GeoJSON -> Shape -> ExtrudeGeometry）
 * 2) 鼠标悬浮高亮/抬升、点击下钻（按 adcode 加载下级地图）
 * 3) 右/左侧使用 ECharts 展示业务指标面板
 * 4) 全屏展示：通过 fixed + inset 0 覆盖整个视口
 *
 * 重要说明：
 * - 坐标系：这里将 d3 投影后的 y 取反（-y），使地图朝上显示
 * - 地图厚度/hover 抬升高度会随 adcode 层级动态调整
 */

const CHINA_ADCODE = '100000';
const GEO_API_BASE = 'https://geo.datav.aliyun.com/areas_v3/bound';

/**
 * 基准厚度（省级地图的默认厚度）
 * 注意：Three.js 世界坐标单位，实际视觉效果会受投影缩放、相机距离影响
 */
const BASE_MAP_DEPTH = 0.2;

/**
 * 根据 adcode 判断当前层级并返回合适的地图厚度
 * - 全国（100000）：厚度更厚，增强整体“体块”感
 * - 省级（xx0000）：使用基准厚度
 * - 市级（xxxx00）：略薄
 * - 区县（xxxxxx）：更薄一些
 */
const getMapDepthByAdcode = (adcode: string) => {
  if (adcode === CHINA_ADCODE) return BASE_MAP_DEPTH * 3;
  // Province-level adcode ends with 0000 (e.g. 110000)
  if (adcode.endsWith('0000')) return BASE_MAP_DEPTH;
  // City-level adcode ends with 00 (e.g. 110100)
  if (adcode.endsWith('00')) return BASE_MAP_DEPTH * 0.8;
  // County/district level (e.g. 110101)
  return BASE_MAP_DEPTH * 0.6;
};

/**
 * hover 抬升高度：始终取当前厚度的一半
 * 这样“突出高度”和“厚度”在视觉上保持一致比例
 */
const getHoverElevationByAdcode = (adcode: string) => getMapDepthByAdcode(adcode) / 2;

export default function VisualScreen() {
  const navigate = useNavigate();
  /**
   * 容器：Three.js canvas 将挂载在这个 div 内
   * 注意：canvas 尺寸会跟随容器尺寸变化（ResizeObserver）
   */
  const containerRef = useRef<HTMLDivElement>(null);

  /** UI 状态 */
  const [loading, setLoading] = useState(false);
  const [currentAdcode, setCurrentAdcode] = useState(CHINA_ADCODE);
  const [history, setHistory] = useState<{adcode: string, name: string}[]>([]);
  const [currentName, setCurrentName] = useState('中国');

  /**
   * tooltip DOM：用于在地图上方显示悬浮提示（省/市名称等）
   * 这里是一个绝对定位的 div，通过 transform 跟随鼠标
   */
  const tooltipRef = useRef<HTMLDivElement>(null);
  const lastMouseDownPos = useRef<{ x: number, y: number } | null>(null);

  /**
   * Three.js 相关对象引用
   * 统一用 ref 保存，避免频繁触发 React 重新渲染，同时便于在 effect cleanup 中释放
   */
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const mapGroupRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  /** 鼠标拾取（Raycaster）相关 */
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const hoveredMeshRef = useRef<THREE.Mesh | null>(null);

  /**
   * 初始化 Three.js
   * - Scene / Camera / Renderer
   * - 光照
   * - OrbitControls
   * - 动画循环：
   *   1) controls.update()
   *   2) 对每个省份 group 的 position.z 做插值，实现 hover 抬升的平滑过渡
   * - ResizeObserver：容器变化时自适应 canvas 和相机投影矩阵
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1) 场景
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2) 相机
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, -20, 90);
    camera.lookAt(0, 10, 0);
    cameraRef.current = camera;

    // 3) 渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4) 光照（基础环境光 + 主方向光 + 补光）
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Slightly dimmer ambient
    scene.add(ambientLight);
    
    // Main directional light from top-left to create strong shadows on the right/bottom sides
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(-20, 50, 50);
    scene.add(directionalLight);

    // Secondary light to fill in some shadows
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(20, -20, 20);
    scene.add(fillLight);

    // 5) 轨道控制器：限制俯仰/水平旋转角度，让视角更像“大屏俯视”
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI * 0.7; // Allow looking from bottom (up to 126 deg)
    controls.minPolarAngle = Math.PI * 0.3; // Allow looking from top (down to 54 deg)
    controls.maxAzimuthAngle = Math.PI / 3; // Limit horizontal rotation (max 60 degrees)
    controls.minAzimuthAngle = -Math.PI / 3; // Limit horizontal rotation (min -60 degrees)
    controlsRef.current = controls;

    // 6) 动画循环
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();

      // hover 抬升效果：对每个省份 group 的 z 做插值，产生平滑过渡
      if (mapGroupRef.current) {
        mapGroupRef.current.children.forEach((child) => {
          if (child.userData.targetZ !== undefined) {
            child.position.z += (child.userData.targetZ - child.position.z) * 0.15;
          }
        });
      }

      renderer.render(scene, camera);
    };
    animate();

    // 7) 自适应容器大小变化
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      if (newWidth === 0 || newHeight === 0) return;
      cameraRef.current.aspect = newWidth / newHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, newHeight);
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    // 8) 资源释放：移除 canvas、停止动画、dispose renderer
    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
      if (renderer && container) {
        container.removeChild(renderer.domElement);
        renderer.dispose();
      }
    };
  }, []);

  /**
   * 将 GeoJSON 渲染到 Three.js 中
   * - 每个 feature（省/市/区）生成一个 Group
   * - feature 多边形坐标 -> d3 投影 -> Three.Shape -> ExtrudeGeometry
   * - 同时绘制边界线（Line）
   * - 渲染后根据包围盒重新计算相机距离与 controls target（聚焦当前地图）
   */
  const renderMap = React.useCallback((geojson: any, adcode: string) => {
    const scene = sceneRef.current;
    if (!scene) return;

    // 本层地图厚度（全国/省/市/区县会不同）
    const mapDepth = getMapDepthByAdcode(adcode);

    // 清理旧地图（从场景移除 + dispose 几何体和材质，避免内存泄漏）
    if (mapGroupRef.current) {
      scene.remove(mapGroupRef.current);
      // Dispose geometries and materials to prevent memory leaks
      mapGroupRef.current.traverse((child: any) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m: any) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }

    const mapGroup = new THREE.Group();
    mapGroupRef.current = mapGroup;
    scene.add(mapGroup);

    // 投影：将 GeoJSON 适配到 [-40,40] 范围（约 80x80 的盒子）
    const projection = geoMercator().fitExtent([[-40, -40], [40, 40]], geojson);

    // 材质：顶面更亮，侧面更暗，强化“厚度”层次
    const mapMaterial = new THREE.MeshPhongMaterial({
      color: 0x4a86e8, // Lighter blue for the top surface
      transparent: false,
      side: THREE.FrontSide,
    });
    const sideMaterial = new THREE.MeshPhongMaterial({
      color: 0x1c4587, // Darker blue for the sides/depth
      transparent: false,
    });

    geojson.features.forEach((feature: any) => {
      const province = new THREE.Group();
      // targetZ 用于 hover 抬升动画
      province.userData = { ...feature.properties, targetZ: 0 }; // Store properties for interaction and animation

      // feature 的几何中心：用于后续定位（如果需要做标签/特效点等）
      const centroid = geoCentroid(feature);
      const [cx, cy] = projection(centroid) as [number, number];
      province.userData.center = new THREE.Vector3(cx, -cy, mapDepth); // Store 3D center

      const coordinates = feature.geometry.coordinates;
      const type = feature.geometry.type;

      const drawPolygon = (polygon: any) => {
        const shape = new THREE.Shape();
        const points: THREE.Vector3[] = [];
        
        polygon.forEach((coord: any, i: number) => {
          const [x, y] = projection(coord) as [number, number];
          if (i === 0) {
            shape.moveTo(x, -y);
          } else {
            shape.lineTo(x, -y);
          }
          // 边界线放在顶面之上一个很小的 epsilon，避免 z-fighting（闪烁）
          points.push(new THREE.Vector3(x, -y, mapDepth + 0.001)); // Slightly above for borders
        });

        // 挤出几何：depth 就是地图厚度
        const extrudeSettings = { depth: mapDepth, bevelEnabled: false }; // Reduced depth
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        
        // 顶面 + 侧面材质（数组形式会按 ExtrudeGeometry 的 group 分配）
        const mesh = new THREE.Mesh(geometry, [mapMaterial.clone(), sideMaterial.clone()]);
        mesh.userData = feature.properties; // Attach data to mesh
        province.add(mesh);

        // 边界线（白色半透明）
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 1, transparent: true, opacity: 0.6 });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        province.add(line);
      };

      if (type === 'Polygon') {
        coordinates.forEach(drawPolygon);
      } else if (type === 'MultiPolygon') {
        coordinates.forEach((multi: any) => multi.forEach(drawPolygon));
      }

      mapGroup.add(province);
    });

    // 自动缩放相机：根据地图包围盒计算距离，并把旋转中心设为当前地图中心
    if (cameraRef.current && controlsRef.current) {
      const box = new THREE.Box3().setFromObject(mapGroup);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      const camera = cameraRef.current;
      const controls = controlsRef.current;

      const aspect = camera.aspect;
      const fov = camera.fov * (Math.PI / 180);

      // Calculate distance to fit both height and width
      const distHeight = size.y / (2 * Math.tan(fov / 2));
      const distWidth = size.x / (2 * Math.tan(fov / 2) * aspect);
      let distance = Math.max(distHeight, distWidth);

      let padding = 1.4; // Add generous margin for sub-regions to ensure they fit

      // 全国地图时：稍微偏移中心，且 padding 调整，让“南海诸岛”不影响主视图
      if (adcode === '100000') {
        center.y += size.y * 0.12;
        padding = 0.9; // Zoom in slightly to ignore South China Sea islands
      }

      distance *= padding;

      // 俯视地图，相机视角略微偏左下（增强立体感）
      // Camera is positioned at -X (left), -Y (bottom), +Z (top-down) relative to the center
      const dir = new THREE.Vector3(-0.15, -0.25, 0.9).normalize();
      
      camera.position.set(
        center.x + dir.x * distance,
        center.y + dir.y * distance,
        dir.z * distance
      );
      
      // 以当前展示地区中心为旋转点
      controls.target.set(center.x, center.y, 0);
      controls.update();
    }
  }, []);

  /**
   * 加载地图数据
   * - 优先请求 _full.json（带下级数据更完整）
   * - 若不存在则回退到 .json
   * - 成功后调用 renderMap 渲染
   */
  const loadMap = React.useCallback(async (adcode: string, name: string) => {
    setLoading(true);
    try {
      // Try fetching the full version (with sub-regions)
      let res = await fetch(`${GEO_API_BASE}/${adcode}_full.json`, { referrerPolicy: 'no-referrer' });
      if (!res.ok) {
        // Fallback to non-full version if full doesn't exist
        res = await fetch(`${GEO_API_BASE}/${adcode}.json`, { referrerPolicy: 'no-referrer' });
      }
      if (!res.ok) throw new Error('Failed to fetch map data');
      
      const geojson = await res.json();
      renderMap(geojson, adcode);
      setCurrentAdcode(adcode);
      setCurrentName(name);
    } catch (error) {
      console.error(error);
      message.error('地图数据加载失败，可能该区域无下级数据');
      // Revert history if failed
      setHistory(prev => {
        if (prev.length > 0 && adcode !== CHINA_ADCODE) {
          // We can't call handleBack directly here easily without dependency issues,
          // so we just reset to the last known good state.
          // In a real app, we might want to trigger a reload of the previous map.
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setLoading(false);
    }
  }, [renderMap]);

  // Initial Load
  // 初次进入页面默认加载全国地图
  useEffect(() => {
    loadMap(CHINA_ADCODE, '中国');
  }, [loadMap]);

  /**
   * 交互：处理鼠标悬停 (hover) 和点击 (click)
   * - 使用 Raycaster 计算鼠标下的 Mesh
   * - 处理悬停颜色加深和 3D 抬升效果
   * - 处理地图下钻（仅在按下和抬起位置接近时触发，区分拖拽旋转）
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      // 转换为 normalized device coordinates (-1 to +1)
      mouseRef.current.x = (mouseX / rect.width) * 2 - 1;
      mouseRef.current.y = -(mouseY / rect.height) * 2 + 1;

      if (!cameraRef.current || !mapGroupRef.current) return;

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(mapGroupRef.current.children, true);

      // 找到第一个被命中的“挤出面 Mesh”（忽略边界线 Line）
      const meshIntersect = intersects.find(
        (intersect) => intersect.object instanceof THREE.Mesh && intersect.object.geometry instanceof THREE.ExtrudeGeometry
      );

      // 取消上一次 hover
      if (hoveredMeshRef.current && hoveredMeshRef.current !== meshIntersect?.object) {
        const mat = hoveredMeshRef.current.material as THREE.Material[];
        if (mat && mat[0]) (mat[0] as THREE.MeshPhongMaterial).color.setHex(0x4a86e8); // Reset to original light blue
        if (hoveredMeshRef.current.parent) {
          hoveredMeshRef.current.parent.userData.targetZ = 0; // Reset elevation target
        }
        hoveredMeshRef.current = null;
        if (tooltipRef.current) {
          tooltipRef.current.style.opacity = '0';
        }
      }

      if (meshIntersect) {
        const object = meshIntersect.object as THREE.Mesh;
        if (hoveredMeshRef.current !== object) {
          hoveredMeshRef.current = object;
          const mat = object.material as THREE.Material[];
          if (mat && mat[0]) (mat[0] as THREE.MeshPhongMaterial).color.setHex(0x6aa2fc); // Slightly lighter blue for hover
          if (object.parent) {
            // hover 抬升：按当前层级厚度动态计算抬升目标值
            object.parent.userData.targetZ = getHoverElevationByAdcode(currentAdcode); // Set target elevation
          }
          if (tooltipRef.current) {
            tooltipRef.current.innerText = object.userData.name || '';
            tooltipRef.current.style.opacity = '1';
          }
        }
        container.style.cursor = 'pointer';
        
        if (tooltipRef.current) {
          tooltipRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY - 15}px, 0) translate(-50%, -100%)`;
        }
      } else {
        container.style.cursor = 'default';
      }
    };

    const onMouseDown = (event: MouseEvent) => {
      lastMouseDownPos.current = { x: event.clientX, y: event.clientY };
    };

    const onMouseUp = (event: MouseEvent) => {
      if (!lastMouseDownPos.current) return;
      
      const dx = event.clientX - lastMouseDownPos.current.x;
      const dy = event.clientY - lastMouseDownPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 如果鼠标移动距离小于 5 像素，视为“点击”而非“拖拽”
      if (distance < 5) {
        if (hoveredMeshRef.current && !loading) {
          const props = hoveredMeshRef.current.userData;
          // 下钻：只有存在下级数据时才继续加载
          if (props.adcode && props.childrenNum !== 0) {
            setHistory(prev => [...prev, { adcode: currentAdcode, name: currentName }]);
            loadMap(props.adcode.toString(), props.name);
          } else {
            message.info(`${props.name} 暂无下级地图数据`);
          }
        }
      }
      lastMouseDownPos.current = null;
    };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('mouseup', onMouseUp);

    return () => {
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mousedown', onMouseDown);
      container.removeEventListener('mouseup', onMouseUp);
    };
  }, [currentAdcode, currentName, loading, loadMap]);

  const handleBack = () => {
    // 返回上一级：history 出栈并重新 loadMap
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(history.slice(0, -1));
    loadMap(prev.adcode, prev.name);
  };

  const handleBackPage = () => {
    navigate(-1);
  };

  /**
   * 以下为 ECharts 图表配置（示例数据）
   * 如需对接真实业务数据，可在这里替换 series.data 或封装成 hooks 拉取接口
   */
  const option1 = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], axisLabel: { color: '#a0aec0' } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1e3a5f' } }, axisLabel: { color: '#a0aec0' } },
    series: [{ data: [120, 200, 150, 80, 70, 110, 130], type: 'bar', itemStyle: { color: '#4fc3f7' } }]
  };

  const option2 = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: ['A', 'B', 'C', 'D', 'E'], axisLabel: { color: '#a0aec0' } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1e3a5f' } }, axisLabel: { color: '#a0aec0' } },
    series: [{ data: [820, 932, 901, 934, 1290], type: 'line', smooth: true, lineStyle: { color: '#f6ad55' }, itemStyle: { color: '#f6ad55' } }]
  };

  const option3 = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['Sales', 'Profit'], textStyle: { color: '#a0aec0' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], axisLabel: { color: '#a0aec0' } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1e3a5f' } }, axisLabel: { color: '#a0aec0' } },
    series: [
      { name: 'Sales', type: 'bar', data: [320, 332, 301, 334, 390, 330], itemStyle: { color: '#4fc3f7' } },
      { name: 'Profit', type: 'line', data: [120, 132, 101, 134, 90, 230], itemStyle: { color: '#68d391' } }
    ]
  };

  const option4 = {
    tooltip: { trigger: 'item' },
    legend: { orient: 'horizontal', bottom: 'bottom', textStyle: { color: '#a0aec0' } },
    series: [
      {
        name: 'Access From',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#0a1a3a',
          borderWidth: 2
        },
        label: { show: false, position: 'center' },
        emphasis: {
          label: { show: true, fontSize: 20, fontWeight: 'bold', color: '#fff' }
        },
        labelLine: { show: false },
        data: [
          { value: 1048, name: 'Search Engine' },
          { value: 735, name: 'Direct' },
          { value: 580, name: 'Email' },
          { value: 484, name: 'Union Ads' },
          { value: 300, name: 'Video Ads' }
        ]
      }
    ]
  };

  const option5 = {
    tooltip: { trigger: 'axis' },
    radar: {
      indicator: [
        { name: 'Sales', max: 6500 },
        { name: 'Admin', max: 16000 },
        { name: 'Tech', max: 30000 },
        { name: 'Support', max: 38000 },
        { name: 'Dev', max: 52000 },
        { name: 'Marketing', max: 25000 }
      ],
      axisName: { color: '#a0aec0' },
      splitLine: { lineStyle: { color: '#1e3a5f' } },
      splitArea: { show: false },
      axisLine: { lineStyle: { color: '#1e3a5f' } }
    },
    series: [
      {
        name: 'Budget vs spending',
        type: 'radar',
        data: [
          { value: [4200, 3000, 20000, 35000, 50000, 18000], name: 'Allocated Budget', itemStyle: { color: '#4fc3f7' } },
          { value: [5000, 14000, 28000, 26000, 42000, 21000], name: 'Actual Spending', itemStyle: { color: '#f6ad55' } }
        ]
      }
    ]
  };

  return (
    /**
     * 全屏容器
     * - fixed + inset-0：确保覆盖整个视口
     * - overflow-hidden：避免外层出现滚动条（内部区域由各面板自行控制）
     */
    <div
      className="w-full h-full bg-[#02091a] p-4 flex flex-col gap-4 overflow-hidden"
    >
      {/* Header */}
      <div className="h-16 shrink-0 px-6 bg-[#0a1a3a] border border-[#1e3a5f] rounded-lg shadow-lg relative flex items-center">
        <div className="absolute left-6 top-1/2 -translate-y-1/2">
          <Button
            type="primary"
            ghost
            icon={<RollbackOutlined />}
            onClick={handleBackPage}
            className="border-[#4fc3f7] text-[#4fc3f7] hover:bg-[#4fc3f7]/20"
          >
            返回上一页
          </Button>
        </div>

        <h2
          className="w-full text-center text-2xl font-bold text-white tracking-widest"
          style={{ textShadow: '0 2px 10px rgba(79, 195, 247, 0.5)' }}
        >
          全国业务数据大屏
        </h2>

        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[#4fc3f7] font-mono flex items-center gap-4">
          <span>当前区域：<span className="text-white font-bold">{currentName}</span></span>
          {history.length > 0 && (
            <Button
              type="primary"
              ghost
              icon={<RollbackOutlined />}
              onClick={handleBack}
              className="border-[#4fc3f7] text-[#4fc3f7] hover:bg-[#4fc3f7]/20"
            >
              返回上级
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-4 grid-rows-5 gap-4 min-h-0">
        {/* Left Column */}
        <div className="col-span-1 row-span-5 flex flex-col gap-4">
          <div className="flex-1 bg-[#0a1a3a] border border-[#1e3a5f] rounded-lg p-4 relative shadow-lg flex flex-col">
            <h3 className="text-[#4fc3f7] font-bold mb-2 shrink-0">具体数据图标1</h3>
            <div className="flex-1 min-h-0">
              <ReactECharts option={option1} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
          <div className="flex-1 bg-[#0a1a3a] border border-[#1e3a5f] rounded-lg p-4 relative shadow-lg flex flex-col">
            <h3 className="text-[#4fc3f7] font-bold mb-2 shrink-0">具体数据图标2</h3>
            <div className="flex-1 min-h-0">
              <ReactECharts option={option2} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        </div>

        {/* Center Column */}
        <div className="col-span-2 row-span-5 flex flex-col gap-4">
          <div className="flex-[3] bg-[#0a1a3a] border border-[#1e3a5f] rounded-lg relative overflow-hidden shadow-lg">
            {/* Map Container */}
            <div ref={containerRef} className="w-full h-full cursor-default relative">
              <div
                ref={tooltipRef}
                className="absolute top-0 left-0 z-50 px-3 py-1 text-sm text-white bg-black/70 border border-[#4fc3f7] rounded pointer-events-none whitespace-nowrap shadow-lg transition-opacity duration-200"
                style={{ opacity: 0, transform: 'translate(-50%, -100%)' }}
              />
            </div>
            {loading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#02091a]/60 backdrop-blur-sm">
                <Spin size="large" description="加载地图数据中..." className="text-[#4fc3f7]" />
              </div>
            )}
            <div className="absolute top-4 left-4 pointer-events-none">
              <h3 className="text-[#4fc3f7] font-bold text-lg" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>地图展示区域</h3>
            </div>
          </div>
          <div className="flex-[2] bg-[#0a1a3a] border border-[#1e3a5f] rounded-lg p-4 relative shadow-lg flex flex-col">
            <h3 className="text-[#4fc3f7] font-bold mb-2 shrink-0">具体数据图标3</h3>
            <div className="flex-1 min-h-0">
              <ReactECharts option={option3} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-1 row-span-5 flex flex-col gap-4">
          <div className="flex-1 bg-[#0a1a3a] border border-[#1e3a5f] rounded-lg p-4 relative shadow-lg flex flex-col">
            <h3 className="text-[#4fc3f7] font-bold mb-2 shrink-0">具体数据图标4</h3>
            <div className="flex-1 min-h-0">
              <ReactECharts option={option4} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
          <div className="flex-1 bg-[#0a1a3a] border border-[#1e3a5f] rounded-lg p-4 relative shadow-lg flex flex-col">
            <h3 className="text-[#4fc3f7] font-bold mb-2 shrink-0">具体数据图标5</h3>
            <div className="flex-1 min-h-0">
              <ReactECharts option={option5} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
