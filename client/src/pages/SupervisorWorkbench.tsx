import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { MapView } from "@/components/Map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Plane,
  RefreshCw,
  Search,
  User,
  Users
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// 员工位置数据类型
interface EmployeeLocation {
  id: number;
  name: string;
  avatar?: string;
  position: {
    lat: number;
    lng: number;
  };
  status: 'traveling' | 'on_site' | 'returning' | 'idle';
  tripId?: number;
  destination?: string;
  taskStatus?: string;
  lastUpdate: string;
  phone?: string;
  department?: string;
}

// 模拟员工位置数据（实际应从API获取）
const mockEmployeeLocations: EmployeeLocation[] = [
  {
    id: 1,
    name: "张三",
    position: { lat: 31.2304, lng: 121.4737 },
    status: 'on_site',
    tripId: 1001,
    destination: "上海大众汽车",
    taskStatus: "设备调试中",
    lastUpdate: new Date().toISOString(),
    phone: "13800138001",
    department: "技术服务部"
  },
  {
    id: 2,
    name: "李四",
    position: { lat: 39.9042, lng: 116.4074 },
    status: 'traveling',
    tripId: 1002,
    destination: "北京奔驰工厂",
    taskStatus: "前往途中",
    lastUpdate: new Date().toISOString(),
    phone: "13800138002",
    department: "技术服务部"
  },
  {
    id: 3,
    name: "王五",
    position: { lat: 23.1291, lng: 113.2644 },
    status: 'on_site',
    tripId: 1003,
    destination: "广州本田",
    taskStatus: "FAT验收",
    lastUpdate: new Date().toISOString(),
    phone: "13800138003",
    department: "项目部"
  },
  {
    id: 4,
    name: "赵六",
    position: { lat: 30.5728, lng: 104.0668 },
    status: 'returning',
    tripId: 1004,
    destination: "成都一汽",
    taskStatus: "任务完成返程",
    lastUpdate: new Date().toISOString(),
    phone: "13800138004",
    department: "技术服务部"
  },
  {
    id: 5,
    name: "钱七",
    position: { lat: 34.3416, lng: 108.9398 },
    status: 'on_site',
    tripId: 1005,
    destination: "西安比亚迪",
    taskStatus: "设备安装",
    lastUpdate: new Date().toISOString(),
    phone: "13800138005",
    department: "安装部"
  }
];

// 状态颜色映射
const statusColors: Record<string, string> = {
  traveling: '#3B82F6', // 蓝色 - 前往途中
  on_site: '#22C55E',   // 绿色 - 现场作业
  returning: '#F59E0B', // 橙色 - 返程中
  idle: '#6B7280'       // 灰色 - 空闲
};

const statusLabels: Record<string, string> = {
  traveling: '前往途中',
  on_site: '现场作业',
  returning: '返程中',
  idle: '空闲'
};

export default function SupervisorWorkbench() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  
  const [employees, setEmployees] = useState<EmployeeLocation[]>(mockEmployeeLocations);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeLocation | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 获取出差申请列表
  const { data: tripRequests } = (trpc.tripRequest.list as any).useQuery({
    status: 'approved',
    limit: 100
  });

  // 过滤员工
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.destination?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || emp.status === statusFilter;
    const matchesDepartment = departmentFilter === "all" || emp.department === departmentFilter;
    return matchesSearch && matchesStatus && matchesDepartment;
  });

  // 统计数据
  const stats = {
    total: employees.length,
    traveling: employees.filter(e => e.status === 'traveling').length,
    onSite: employees.filter(e => e.status === 'on_site').length,
    returning: employees.filter(e => e.status === 'returning').length,
    idle: employees.filter(e => e.status === 'idle').length
  };

  // 获取唯一部门列表
  const departments = Array.from(new Set(employees.map(e => e.department).filter(Boolean)));

  // 创建自定义标记元素
  const createMarkerContent = useCallback((employee: EmployeeLocation) => {
    const div = document.createElement('div');
    div.className = 'employee-marker';
    div.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
      ">
        <div style="
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: ${statusColors[employee.status]};
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 14px;
        ">
          ${employee.name.charAt(0)}
        </div>
        <div style="
          background: white;
          padding: 2px 8px;
          border-radius: 4px;
          margin-top: 4px;
          font-size: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          white-space: nowrap;
        ">
          ${employee.name}
        </div>
      </div>
    `;
    return div;
  }, []);

  // 地图初始化回调
  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    
    // 清除旧标记
    markersRef.current.forEach(marker => marker.map = null);
    markersRef.current = [];

    // 添加员工标记
    filteredEmployees.forEach(employee => {
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: employee.position,
        title: employee.name,
        content: createMarkerContent(employee)
      });

      marker.addListener('click', () => {
        setSelectedEmployee(employee);
        map.panTo(employee.position);
        map.setZoom(14);
      });

      markersRef.current.push(marker);
    });

    // 调整地图视野以包含所有标记
    if (filteredEmployees.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      filteredEmployees.forEach(emp => bounds.extend(emp.position));
      map.fitBounds(bounds);
    }
  }, [filteredEmployees, createMarkerContent]);

  // 更新标记
  useEffect(() => {
    if (mapRef.current) {
      handleMapReady(mapRef.current);
    }
  }, [filteredEmployees, handleMapReady]);

  // 刷新位置数据
  const handleRefresh = async () => {
    setIsRefreshing(true);
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000));
    // 更新最后更新时间
    setEmployees(prev => prev.map(emp => ({
      ...emp,
      lastUpdate: new Date().toISOString()
    })));
    setIsRefreshing(false);
  };

  // 定位到员工
  const locateEmployee = (employee: EmployeeLocation) => {
    setSelectedEmployee(employee);
    if (mapRef.current) {
      mapRef.current.panTo(employee.position);
      mapRef.current.setZoom(14);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        title="主管工作台"
        description="实时监控出差员工位置和任务状态"
        actions={
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            刷新位置
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={Users} label="出差总人数" value={stats.total} />
        <StatCard icon={Plane} label="前往途中" value={stats.traveling} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={MapPin} label="现场作业" value={stats.onSite} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={Clock} label="返程中" value={stats.returning} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        <StatCard icon={User} label="空闲" value={stats.idle} iconColor="text-gray-500" iconBg="bg-gray-500/10" />
      </div>

      {/* 主内容区 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 地图区域 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">员工位置地图</CardTitle>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span>前往途中</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>现场作业</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span>返程中</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <MapView
                className="h-[500px] rounded-lg"
                initialCenter={{ lat: 35.8617, lng: 104.1954 }} // 中国中心
                initialZoom={5}
                onMapReady={handleMapReady}
              />
            </CardContent>
          </Card>
        </div>

        {/* 员工列表 */}
        <div className="space-y-4">
          {/* 筛选区 */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索员工或目的地..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="状态筛选" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="traveling">前往途中</SelectItem>
                    <SelectItem value="on_site">现场作业</SelectItem>
                    <SelectItem value="returning">返程中</SelectItem>
                    <SelectItem value="idle">空闲</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="部门筛选" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部部门</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept!}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* 员工列表 */}
          <Card className="max-h-[500px] overflow-auto">
            <CardHeader className="pb-2 sticky top-0 bg-card z-10">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>出差员工列表</span>
                <Badge variant="secondary">{filteredEmployees.length}人</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredEmployees.map(employee => (
                <div
                  key={employee.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent ${
                    selectedEmployee?.id === employee.id ? 'border-primary bg-accent' : ''
                  }`}
                  onClick={() => locateEmployee(employee)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: statusColors[employee.status] }}
                      >
                        {employee.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{employee.name}</p>
                        <p className="text-sm text-muted-foreground">{employee.department}</p>
                      </div>
                    </div>
                    <Badge 
                      variant="outline"
                      style={{ 
                        borderColor: statusColors[employee.status],
                        color: statusColors[employee.status]
                      }}
                    >
                      {statusLabels[employee.status]}
                    </Badge>
                  </div>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span>{employee.destination}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{employee.taskStatus}</span>
                    </div>
                  </div>
                </div>
              ))}
              {filteredEmployees.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>没有找到匹配的员工</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 员工详情弹窗 */}
      {selectedEmployee && (
        <Card className="fixed bottom-4 right-4 w-80 shadow-lg z-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{selectedEmployee.name}</CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedEmployee(null)}
              >
                ✕
              </Button>
            </div>
            <CardDescription>{selectedEmployee.department}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge 
                style={{ 
                  backgroundColor: statusColors[selectedEmployee.status],
                  color: 'white'
                }}
              >
                {statusLabels[selectedEmployee.status]}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {selectedEmployee.taskStatus}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{selectedEmployee.destination}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{selectedEmployee.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>更新于 {new Date(selectedEmployee.lastUpdate).toLocaleTimeString()}</span>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" className="flex-1">
                <Phone className="w-4 h-4 mr-1" />
                联系
              </Button>
              <Button size="sm" variant="outline" className="flex-1">
                查看行程
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
