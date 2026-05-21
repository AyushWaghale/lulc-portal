import React, { useState, useEffect, useContext } from 'react';
import { MapContainer, TileLayer, GeoJSON, ZoomControl, LayersControl, useMap } from 'react-leaflet';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar, Doughnut } from 'react-chartjs-2';
import { Layers, Map as MapIcon, BarChart3, Info, MapPin, Search, LogOut, Shield, User, TrendingUp, Database, X, ChevronDown, ChevronUp, Droplet, Route, Home, Focus, Navigation } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import * as turf from '@turf/turf';

const API = import.meta.env.VITE_API_URL;

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// Helper component to center map from external state
const MapController = ({ searchBounds }) => {
  const map = useMap();
  useEffect(() => {
    if (searchBounds) {
      map.fitBounds(searchBounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [searchBounds, map]);
  return null;
};

function MapPortal() {
  const { user, logout } = useContext(AuthContext);
  const [layersData, setLayersData] = useState({ districts: null, talukas: null, villages: null, roads: null, lulc: null });
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchBounds, setSearchBounds] = useState(null);

  // Analysis state (real data from API)
  const [analysisData, setAnalysisData] = useState({ lulc: null, road: null, overview: null });
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [analysisTab, setAnalysisTab] = useState('lulc');
  const [selectionData, setSelectionData] = useState(null);
  
  // New UI State
  const [activeSidebarTab, setActiveSidebarTab] = useState('explore');
  const [openAccordion, setOpenAccordion] = useState(1);

  // Helper for water resources (calculated on frontend)
  const getWaterResourceStats = () => {
    if (!layersData.lulc) return { count: 0 };
    const waterFeatures = layersData.lulc.features.filter(f => 
      f.properties.DISCR && (
        f.properties.DISCR.toLowerCase().includes('water') || 
        f.properties.DISCR.toLowerCase().includes('reservoir') || 
        f.properties.DISCR.toLowerCase().includes('tank') ||
        f.properties.DISCR.toLowerCase().includes('river')
      )
    );
    return { count: waterFeatures.length };
  };

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [districts, talukas, villages, roads, lulc] = await Promise.all([
          axios.get(`${API}/districts`).then(res => res.data),
          axios.get(`${API}/talukas`).then(res => res.data),
          axios.get(`${API}/villages`).then(res => res.data),
          axios.get(`${API}/roads`).then(res => res.data),
          axios.get(`${API}/lulc`).then(res => res.data)
        ]);
        setLayersData({ districts, talukas, villages, roads, lulc });
        setLoading(false);
      } catch (err) {
        console.error("Error fetching layers:", err);
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  // Fetch real analysis data
  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const [lulcRes, roadRes, overviewRes] = await Promise.all([
          axios.get(`${API}/analysis/lulc-summary`),
          axios.get(`${API}/analysis/road-summary`),
          axios.get(`${API}/analysis/overview`)
        ]);
        setAnalysisData({ lulc: lulcRes.data, road: roadRes.data, overview: overviewRes.data });
        setAnalysisLoading(false);
      } catch (err) {
        console.error("Error fetching analysis:", err);
        setAnalysisLoading(false);
      }
    };
    fetchAnalysis();
  }, []);

  // Handle Search Input
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const results = [];
    
    const checkFeatures = (layerData, type) => {
      if (!layerData) return;
      layerData.features.forEach(f => {
        const name = f.properties.NAME || f.properties.DTNAME || f.properties.THENAME || f.properties.VIL_NAME;
        if (name && name.toLowerCase().includes(q)) {
          results.push({ name, type, feature: f });
        }
      });
    };

    checkFeatures(layersData.districts, 'District');
    checkFeatures(layersData.talukas, 'Taluka');
    checkFeatures(layersData.villages, 'Village');
    
    setSearchResults(results.slice(0, 5)); // Limit to top 5
  }, [searchQuery, layersData]);

  const handleSelectSearchResult = (result) => {
    setSelectedFeature(result.feature);
    setSearchQuery('');
    setSearchResults([]);
    
    // Calculate bounding box to zoom using turf
    const bbox = turf.bbox(result.feature);
    // turf returns [minX, minY, maxX, maxY] -> leaflet needs [[minY, minX], [maxY, maxX]]
    setSearchBounds([[bbox[1], bbox[0]], [bbox[3], bbox[2]]]);
  };

  const onEachFeature = (feature, layer) => {
    layer.on({
      click: (e) => {
        setSelectedFeature(feature);
        layer.setStyle({ weight: 3, color: '#2563eb', fillOpacity: 0.7 });
      },
      mouseover: (e) => {
        e.target.setStyle({ weight: 2, color: '#3b82f6', fillOpacity: 0.5 });
      },
      mouseout: (e) => {
        e.target.setStyle(getStyle(feature.properties.LAYER || 'default')(feature));
      }
    });
    const name = feature.properties.NAME || feature.properties.DTNAME || feature.properties.THENAME || feature.properties.VIL_NAME || feature.properties.DISCR || "Feature";
    layer.bindTooltip(name, { sticky: true, className: 'custom-tooltip' });
  };

  const styles = {
    district: { weight: 2, color: '#475569', fillColor: '#cbd5e1', fillOpacity: 0.2 },
    taluka: { weight: 1, color: '#334155', fillColor: '#94a3b8', fillOpacity: 0.3 },
    village: { weight: 0.5, color: '#64748b', fillColor: '#e2e8f0', fillOpacity: 0.4 },
    lulc: { weight: 1, color: '#16a34a', fillColor: '#22c55e', fillOpacity: 0.5 },
    road: { weight: 2, color: '#ef4444', opacity: 0.8 },
    default: { weight: 1, fillOpacity: 0.2 }
  };

  const getStyle = (type) => (feature) => {
    if (type === 'lulc' && feature.properties.DISCR) {
      if (feature.properties.DISCR.toLowerCase().includes('agri')) return { weight: 1, color: '#16a34a', fillColor: '#4ade80', fillOpacity: 0.6 };
      if (feature.properties.DISCR.toLowerCase().includes('forest')) return { weight: 1, color: '#14532d', fillColor: '#166534', fillOpacity: 0.6 };
      if (feature.properties.DISCR.toLowerCase().includes('water') || feature.properties.DISCR.toLowerCase().includes('reservoir')) return { weight: 1, color: '#2563eb', fillColor: '#60a5fa', fillOpacity: 0.6 };
      if (feature.properties.DISCR.toLowerCase().includes('built')) return { weight: 1, color: '#b91c1c', fillColor: '#f87171', fillOpacity: 0.6 };
      if (feature.properties.DISCR.toLowerCase().includes('river')) return { weight: 1, color: '#0284c7', fillColor: '#38bdf8', fillOpacity: 0.6 };
      if (feature.properties.DISCR.toLowerCase().includes('tank')) return { weight: 1, color: '#0369a1', fillColor: '#7dd3fc', fillOpacity: 0.6 };
    }
    return styles[type] || styles.default;
  };

  const getFeatureName = () => {
    if (!selectedFeature) return 'Selected Region';
    const props = selectedFeature.properties;
    return props.NAME || props.DTNAME || props.THENAME || props.VIL_NAME || props.DISCR || 'Selected Feature';
  };

  useEffect(() => {
    if (!selectedFeature) {
      setSelectionData(null);
      return;
    }

    const computeSelectionData = () => {
      try {
        const props = selectedFeature.properties;
        let layerType = 'Unknown';
        if (props.DTNAME) layerType = 'District';
        else if (props.THENAME) layerType = 'Taluka';
        else if (props.VIL_NAME) layerType = 'Village';
        else if (props.ROAD_TYPE) layerType = 'Road';
        else if (props.DISCR) layerType = 'LULC';

        let areaSqKm = 0;
        let perimeterKm = 0;
        if (selectedFeature.geometry && (selectedFeature.geometry.type === 'Polygon' || selectedFeature.geometry.type === 'MultiPolygon')) {
          areaSqKm = turf.area(selectedFeature) / 1000000;
          perimeterKm = turf.length(selectedFeature, {units: 'kilometers'});
        } else if (selectedFeature.geometry && (selectedFeature.geometry.type === 'LineString' || selectedFeature.geometry.type === 'MultiLineString')) {
          perimeterKm = turf.length(selectedFeature, {units: 'kilometers'});
        }

        const data = {
          type: layerType,
          area: areaSqKm,
          perimeter: perimeterKm,
          nearestVillages: null,
          containedRoads: null
        };

        if (layerType === 'Village' && layersData.villages) {
          const center = turf.centroid(selectedFeature);
          const distances = [];
          layersData.villages.features.forEach(v => {
            if (v.properties.VIL_NAME !== props.VIL_NAME) {
              const vCenter = turf.centroid(v);
              const dist = turf.distance(center, vCenter, {units: 'kilometers'});
              distances.push({ name: v.properties.VIL_NAME, distance: dist });
            }
          });
          distances.sort((a, b) => a.distance - b.distance);
          data.nearestVillages = distances.slice(0, 5);
        } else if ((layerType === 'Taluka' || layerType === 'District') && layersData.roads) {
          const regionName = layerType === 'Taluka' ? props.THENAME : props.DTNAME;
          const roadCounts = {};
          layersData.roads.features.forEach(r => {
            if ((layerType === 'Taluka' && r.properties.TALUK === regionName) || layerType === 'District') {
               const rt = r.properties.ROAD_TYPE || 'Unknown';
               roadCounts[rt] = (roadCounts[rt] || 0) + 1;
            }
          });
          data.containedRoads = Object.keys(roadCounts).map(k => ({ type: k, count: roadCounts[k] }));
        }

        setSelectionData(data);
      } catch (e) {
        console.error("Error computing selection data", e);
      }
    };

    computeSelectionData();
  }, [selectedFeature, layersData]);

  const cleanProperties = (props) => {
    const ignoreKeys = ['OBJECTID', 'OBJECTID_1', 'Shape_Leng', 'Shape_Area', 'Cent_lng', 'Cent_lat', 'LAYER'];
    const formatted = {};
    
    Object.entries(props).forEach(([k, v]) => {
      if (ignoreKeys.includes(k) || k.endsWith('CODE') || k.endsWith('ID') || v === null || v === undefined) return;
      if (typeof v === 'object') return;
      
      let keyName = k;
      if (k === 'DTNAME' || k === 'DTENAME') keyName = 'District';
      if (k === 'THENAME') keyName = 'Taluka';
      if (k === 'VIL_NAME') keyName = 'Village Name';
      if (k === 'ROAD_TYPE') keyName = 'Road Type';
      if (k === 'DISCR') keyName = 'LULC Type';
      if (k === 'AREA' || k === 'PERIMETER' || k === 'LENGTH') return; // Handled by turf
  
      formatted[keyName] = v;
    });
    return formatted;
  };

  // Build chart data from real analysis
  const getLulcChart = () => {
    if (!analysisData.lulc) return null;
    return {
      labels: analysisData.lulc.labels,
      datasets: [{
        data: analysisData.lulc.counts,
        backgroundColor: analysisData.lulc.colors,
        borderWidth: 0,
        hoverOffset: 8,
      }]
    };
  };

  const getRoadChart = () => {
    if (!analysisData.road) return null;
    return {
      labels: analysisData.road.labels,
      datasets: [{
        label: 'Road Segments',
        data: analysisData.road.counts,
        backgroundColor: analysisData.road.colors,
        borderRadius: 6,
        borderSkipped: false,
      }]
    };
  };

  const getTalukaVillageChart = () => {
    if (!analysisData.overview?.talukaVillages) return null;
    const data = analysisData.overview.talukaVillages.slice(0, 10);
    const palette = ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe', '#818cf8', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95'];
    return {
      labels: data.map(t => t._id || 'Unknown'),
      datasets: [{
        label: 'Villages',
        data: data.map(t => t.count),
        backgroundColor: palette.slice(0, data.length),
        borderRadius: 6,
        borderSkipped: false,
      }]
    };
  };

  const lulcChart = getLulcChart();
  const roadChart = getRoadChart();
  const talukaChart = getTalukaVillageChart();

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-full md:w-[520px] flex-shrink-0 bg-white border-r border-slate-200 shadow-xl z-20 flex flex-col transition-all duration-300 h-[50vh] md:h-screen">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <MapIcon className="text-indigo-600 w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Maharashtra LULC</h1>
              <p className="text-xs text-slate-500 font-medium">Welcome, {user?.name}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Link to="/profile" className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="My Profile">
              <User size={18} />
            </Link>
            {user?.role === 'admin' && (
              <Link to="/admin" className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Admin Dashboard">
                <Shield size={18} />
              </Link>
            )}
            <button onClick={logout} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        <div className="flex border-b border-slate-200 bg-white shrink-0">
          <button 
            onClick={() => setActiveSidebarTab('explore')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${activeSidebarTab === 'explore' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            <MapIcon size={16} /> Explore
          </button>
          <button 
            onClick={() => setActiveSidebarTab('analytics')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${activeSidebarTab === 'analytics' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            <BarChart3 size={16} /> Analysis Center
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-slate-300">
          
          {/* EXPLORE TAB */}
          {activeSidebarTab === 'explore' && (
            <div className="space-y-5 animate-in fade-in duration-300">
              
              {/* Search Bar */}
              <div className="relative">
                <div className="flex items-center bg-white border border-slate-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 shadow-sm transition-shadow">
                  <Search className="text-slate-400 w-4 h-4 mr-2" />
                  <input 
                    type="text" 
                    className="w-full text-sm outline-none bg-transparent" 
                    placeholder="Search District, Taluka, or Village..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {searchResults.length > 0 && (
                  <div className="absolute top-full mt-1 w-full bg-white border border-slate-200 shadow-xl rounded-lg overflow-hidden z-50">
                    {searchResults.map((res, i) => (
                      <div 
                        key={i} 
                        className="px-4 py-2 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 last:border-0"
                        onClick={() => handleSelectSearchResult(res)}
                      >
                        <p className="text-sm font-medium text-slate-800">{res.name}</p>
                        <p className="text-xs text-indigo-500 uppercase tracking-wider font-bold">{res.type}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Feature Info */}
              {selectedFeature && (
                <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl p-4 border border-indigo-100 shadow-md animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between mb-3 border-b border-indigo-100 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-100 rounded-md">
                        <MapPin className="w-4 h-4 text-indigo-600" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">{getFeatureName()}</h3>
                    </div>
                    <button 
                      onClick={() => setSelectedFeature(null)}
                      className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded-md transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-3 gap-x-2">
                    {Object.entries(cleanProperties(selectedFeature.properties)).slice(0, 6).map(([key, val]) => (
                      <div key={key} className="text-xs">
                        <span className="text-slate-500 block mb-0.5">{key}</span>
                        <span className="text-slate-800 font-semibold">{typeof val === 'number' ? val.toLocaleString() : val}</span>
                      </div>
                    ))}
                    {selectionData?.area > 0 && (
                      <div className="text-xs">
                        <span className="text-slate-500 block mb-0.5">Area</span>
                        <span className="text-slate-800 font-semibold">{selectionData.area.toFixed(2)} Sq Km</span>
                      </div>
                    )}
                    {selectionData?.perimeter > 0 && (
                      <div className="text-xs">
                        <span className="text-slate-500 block mb-0.5">{selectionData.type === 'Road' ? 'Length' : 'Perimeter'}</span>
                        <span className="text-slate-800 font-semibold">{selectionData.perimeter.toFixed(2)} Km</span>
                      </div>
                    )}
                  </div>

                  {/* Contextual Charts */}
                  {selectionData?.nearestVillages?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-indigo-100">
                      <h4 className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider mb-2">Nearest Villages</h4>
                      <div className="h-40 w-full">
                        <Bar 
                          data={{
                            labels: selectionData.nearestVillages.map(v => v.name),
                            datasets: [{
                              label: 'Distance (km)',
                              data: selectionData.nearestVillages.map(v => v.distance),
                              backgroundColor: '#6366f1',
                              borderRadius: 4
                            }]
                          }} 
                          options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { display: false } }, x: { grid: { display: false } } } }} 
                        />
                      </div>
                    </div>
                  )}

                  {selectionData?.containedRoads?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-indigo-100">
                      <h4 className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider mb-2">Road Network Distribution</h4>
                      <div className="h-40 w-full flex items-center justify-center">
                        <Pie 
                          data={{
                            labels: selectionData.containedRoads.map(r => r.type),
                            datasets: [{
                              data: selectionData.containedRoads.map(r => r.count),
                              backgroundColor: ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981'],
                              borderWidth: 0
                            }]
                          }} 
                          options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } } } }} 
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Layer Info Panel */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  <h2 className="text-xs font-bold tracking-wide uppercase text-slate-800">Map Layers</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700"><div className="w-3 h-3 bg-red-500 rounded-sm shadow-sm"></div>Roads</div>
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700"><div className="w-3 h-3 bg-slate-300 border border-slate-400 rounded-sm shadow-sm"></div>Villages</div>
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700"><div className="w-3 h-3 bg-slate-400 border border-slate-500 rounded-sm shadow-sm"></div>Talukas</div>
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700"><div className="w-3 h-3 bg-slate-200 border border-slate-600 rounded-sm shadow-sm"></div>Districts</div>
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700"><div className="w-3 h-3 bg-green-500 rounded-sm shadow-sm"></div>LULC</div>
                </div>
              </div>

              {/* Overview Stats */}
              {analysisData.overview && (
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-4">
                    <Database className="w-4 h-4 text-indigo-500" />
                    <h2 className="text-xs font-bold tracking-wide uppercase text-slate-800">Dataset Overview</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Talukas', value: analysisData.overview.counts.talukas, color: 'bg-blue-50 text-blue-700 border-blue-100' },
                      { label: 'Villages', value: analysisData.overview.counts.villages, color: 'bg-green-50 text-green-700 border-green-100' },
                      { label: 'Roads', value: analysisData.overview.counts.roads, color: 'bg-red-50 text-red-700 border-red-100' },
                      { label: 'LULC', value: analysisData.overview.counts.lulc, color: 'bg-amber-50 text-amber-700 border-amber-100' },
                    ].map(stat => (
                      <div key={stat.label} className={`${stat.color} border rounded-xl p-3 text-center`}>
                        <p className="text-xl font-black">{stat.value?.toLocaleString()}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 mt-1">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ANALYTICS TAB (6 Categories) */}
          {activeSidebarTab === 'analytics' && (
            <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
              
              {/* Category 1: LULC Area Analysis */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <button 
                  onClick={() => setOpenAccordion(openAccordion === 1 ? null : 1)}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 text-green-700 rounded-lg"><Layers size={18} /></div>
                    <div className="text-left">
                      <h3 className="font-bold text-slate-800">1. LULC Area Analysis</h3>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">Area per class • Distribution</p>
                    </div>
                  </div>
                  {openAccordion === 1 ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                </button>
                {openAccordion === 1 && (
                  <div className="p-4 border-t border-slate-200 animate-in slide-in-from-top-2 duration-200">
                    {analysisLoading ? <p className="text-xs text-center py-4 text-slate-500">Loading...</p> : (
                      <>
                        <div className="h-52 w-full flex items-center justify-center mb-4">
                          {lulcChart && <Doughnut data={lulcChart} options={{ maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } } } }} />}
                        </div>
                        <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-center">
                          <p className="text-xl font-bold text-green-800">{analysisData.overview?.counts.lulc.toLocaleString()}</p>
                          <p className="text-xs text-green-600 font-medium">Total Land Use Polygons</p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Category 2: Road Network Analysis */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <button 
                  onClick={() => setOpenAccordion(openAccordion === 2 ? null : 2)}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 text-orange-700 rounded-lg"><Route size={18} /></div>
                    <div className="text-left">
                      <h3 className="font-bold text-slate-800">2. Road Network Analysis</h3>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">Length by type • Density</p>
                    </div>
                  </div>
                  {openAccordion === 2 ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                </button>
                {openAccordion === 2 && (
                  <div className="p-4 border-t border-slate-200 animate-in slide-in-from-top-2 duration-200">
                    {analysisLoading ? <p className="text-xs text-center py-4 text-slate-500">Loading...</p> : (
                      <>
                        <div className="h-52 w-full mb-4">
                          {roadChart && <Bar data={roadChart} options={{ indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { grid: { display: false }, ticks: { font: { size: 10 } } } } }} />}
                        </div>
                        <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-center">
                          <p className="text-xl font-bold text-orange-800">{analysisData.overview?.counts.roads.toLocaleString()}</p>
                          <p className="text-xs text-orange-600 font-medium">Total Road Segments</p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Category 3: Water Resource Analysis */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <button 
                  onClick={() => setOpenAccordion(openAccordion === 3 ? null : 3)}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 text-blue-700 rounded-lg"><Droplet size={18} /></div>
                    <div className="text-left">
                      <h3 className="font-bold text-slate-800">3. Water Resource Analysis</h3>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">Water bodies • Distribution</p>
                    </div>
                  </div>
                  {openAccordion === 3 ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                </button>
                {openAccordion === 3 && (
                  <div className="p-4 border-t border-slate-200 animate-in slide-in-from-top-2 duration-200">
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-center">
                      <Droplet className="w-8 h-8 text-blue-500 mx-auto mb-2 opacity-50" />
                      <p className="text-2xl font-black text-blue-800">{getWaterResourceStats().count.toLocaleString()}</p>
                      <p className="text-xs text-blue-600 font-medium uppercase tracking-wider mt-1">Identified Water Bodies</p>
                      <p className="text-[10px] text-slate-500 mt-2">Extracted dynamically from LULC dataset.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Category 4: Village-level Analysis */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <button 
                  onClick={() => setOpenAccordion(openAccordion === 4 ? null : 4)}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 text-purple-700 rounded-lg"><Home size={18} /></div>
                    <div className="text-left">
                      <h3 className="font-bold text-slate-800">4. Village-level Analysis</h3>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">Village Stats • Distribution</p>
                    </div>
                  </div>
                  {openAccordion === 4 ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                </button>
                {openAccordion === 4 && (
                  <div className="p-4 border-t border-slate-200 animate-in slide-in-from-top-2 duration-200">
                     {analysisLoading ? <p className="text-xs text-center py-4 text-slate-500">Loading...</p> : (
                      <>
                        <h4 className="text-[10px] font-bold text-slate-500 text-center uppercase tracking-wider mb-2">Villages per Taluka (Top 10)</h4>
                        <div className="h-48 w-full mb-4">
                          {talukaChart && <Bar data={talukaChart} options={{ indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { grid: { display: false }, ticks: { font: { size: 10 } } } } }} />}
                        </div>
                        <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-center">
                          <p className="text-xl font-bold text-purple-800">{analysisData.overview?.counts.villages.toLocaleString()}</p>
                          <p className="text-xs text-purple-600 font-medium">Total Villages</p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>


            </div>
          )}
        </div>
      </aside>

      {/* Main Map Area */}
      <main className="flex-1 relative bg-slate-100">
        {loading && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 bg-white p-5 rounded-2xl shadow-xl border border-slate-100">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-indigo-600 font-bold text-sm tracking-wide">Fetching Layers...</p>
            </div>
          </div>
        )}
        
        <MapContainer center={[21.1458, 79.0882]} zoom={9} className="h-full w-full z-10" zoomControl={false}>
          <MapController searchBounds={searchBounds} />
          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
          <ZoomControl position="bottomright" />
          
          <LayersControl position="topright">
            {layersData.districts && <LayersControl.Overlay checked name="1. Districts"><GeoJSON data={layersData.districts} style={getStyle('district')} onEachFeature={onEachFeature} /></LayersControl.Overlay>}
            {layersData.talukas && <LayersControl.Overlay checked name="2. Talukas"><GeoJSON data={layersData.talukas} style={getStyle('taluka')} onEachFeature={onEachFeature} /></LayersControl.Overlay>}
            {layersData.villages && <LayersControl.Overlay checked name="3. Villages"><GeoJSON data={layersData.villages} style={getStyle('village')} onEachFeature={onEachFeature} /></LayersControl.Overlay>}
            {layersData.roads && <LayersControl.Overlay checked name="4. Roads"><GeoJSON data={layersData.roads} style={getStyle('road')} onEachFeature={onEachFeature} /></LayersControl.Overlay>}
            {layersData.lulc && <LayersControl.Overlay checked name="5. LULC Polygons"><GeoJSON data={layersData.lulc} style={getStyle('lulc')} onEachFeature={onEachFeature} /></LayersControl.Overlay>}
          </LayersControl>
        </MapContainer>
      </main>
    </div>
  );
}

export default MapPortal;
