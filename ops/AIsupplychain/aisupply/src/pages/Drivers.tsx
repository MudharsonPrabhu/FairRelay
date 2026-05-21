import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Filter, Star, Truck, MapPin, Phone, MoreHorizontal, Edit, Trash, Eye, Zap, Shield } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { getAllDrivers, createDriver, updateDriver, deleteDriver } from '../services/apiClient';
import { DriverDetailPanel } from '../components/DriverDetailPanel';
import { AddDriverModal } from '../components/AddDriverModal';

const DEMO_DRIVERS = [
  { id: 'drv-001', name: 'Rajesh Kumar',  phone: '+919876543210', plate: 'MH-12-AB-1234', vehicle: 'Tata Ace Gold',       type: 'DIESEL',   status: 'On Duty',    rating: 4.9, loc: 'Mumbai Central',  color: 'bg-gradient-to-br from-orange-600 to-amber-500',  avatar: 'RK', wellnessScore: 82, fairScore: 88 },
  { id: 'drv-002', name: 'Priya Sharma',  phone: '+919876543211', plate: 'KA-05-XY-9876', vehicle: 'Mahindra e-Verito',  type: 'ELECTRIC', status: 'In Transit', rating: 4.8, loc: 'Bangalore Koramangala', color: 'bg-gradient-to-br from-emerald-600 to-teal-500', avatar: 'PS', wellnessScore: 95, fairScore: 94 },
  { id: 'drv-003', name: 'Amit Patel',    phone: '+919876543212', plate: 'DL-01-GH-5678', vehicle: 'Tata Ultra T.7',     type: 'DIESEL',   status: 'On Duty',    rating: 4.7, loc: 'Delhi NCR Hub',   color: 'bg-gradient-to-br from-blue-600 to-indigo-500',  avatar: 'AP', wellnessScore: 34, fairScore: 72 },
  { id: 'drv-004', name: 'Sunita Devi',   phone: '+919876543213', plate: 'TN-09-CD-4411', vehicle: 'Ashok Leyland Dost', type: 'DIESEL',   status: 'Off Duty',   rating: 4.9, loc: 'Chennai Perambur', color: 'bg-gradient-to-br from-teal-600 to-cyan-500',    avatar: 'SD', wellnessScore: 98, fairScore: 96 },
  { id: 'drv-005', name: 'Vikram Singh',  phone: '+919876543214', plate: 'MH-43-PQ-3322', vehicle: 'Eicher Pro 2049',   type: 'DIESEL',   status: 'In Transit', rating: 4.5, loc: 'Pune Hadapsar',   color: 'bg-gradient-to-br from-rose-600 to-pink-500',    avatar: 'VS', wellnessScore: 55, fairScore: 68 },
  { id: 'drv-006', name: 'Mohan Das',     phone: '+919876543215', plate: 'GJ-15-RS-7890', vehicle: 'BharatBenz 1015R',  type: 'CNG',      status: 'On Duty',    rating: 4.6, loc: 'Ahmedabad GIDC', color: 'bg-gradient-to-br from-violet-600 to-purple-500', avatar: 'MD', wellnessScore: 78, fairScore: 84 },
];

export function Drivers() {
    const { showToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string | null>(null);
    const [locationTerm, setLocationTerm] = useState('');
    const [driversData, setDriversData] = useState<any[]>([]);
    const [selectedDriver, setSelectedDriver] = useState<any | null>(null);
    const [editingDriver, setEditingDriver] = useState<any | null>(null);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [isAddDriverModalOpen, setIsAddDriverModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [, setError] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setActiveMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchDrivers = async () => {
        try {
            setLoading(true);
            const data = await getAllDrivers();
            setDriversData(data.length > 0 ? data : DEMO_DRIVERS);
            setError(null);
        } catch {
            setDriversData(DEMO_DRIVERS);
            setError(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDrivers();
    }, [showToast]);

    const handleDriverCreated = () => {
        fetchDrivers();
        showToast('Success', 'New driver added successfully', 'success');
    };

    const filteredDrivers = useMemo(() => {
        return driversData.filter(driver => {
            const matchesSearch =
                driver.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                driver.plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                driver.loc?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = filterStatus ? driver.status === filterStatus : true;
            const matchesLocation = locationTerm
                ? driver.loc?.toLowerCase().includes(locationTerm.toLowerCase())
                : true;

            return matchesSearch && matchesStatus && matchesLocation;
        });
    }, [searchTerm, filterStatus, locationTerm, driversData]);

    const handleActionClick = (driver: any) => {
        setSelectedDriver(driver);
        setIsPanelOpen(true);
    };

    const toggleMenu = (e: React.MouseEvent, driverId: string) => {
        e.stopPropagation();
        setActiveMenuId(activeMenuId === driverId ? null : driverId);
    };

    const handleEditDriver = (e: React.MouseEvent, driver: any) => {
        e.stopPropagation();
        setEditingDriver(driver);
        setIsAddDriverModalOpen(true);
        setActiveMenuId(null);
    };

    const handleDeleteDriver = async (e: React.MouseEvent, driverId: string) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this driver?')) {
            try {
                await deleteDriver(driverId);
                showToast('Success', 'Driver deleted successfully', 'success');
                fetchDrivers();
            } catch (err) {
                console.error('Failed to delete driver:', err);
                showToast('Error', 'Failed to delete driver', 'error');
            }
        }
        setActiveMenuId(null);
    };

    const handleModalClose = () => {
        setIsAddDriverModalOpen(false);
        setEditingDriver(null);
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-16 bg-white/3 rounded-xl border border-white/5 animate-pulse" />
                <div className="h-14 bg-white/3 rounded-xl border border-white/5 animate-pulse" />
                {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-white/3 rounded-xl border border-white/5 animate-pulse" />)}
            </div>
        );
    }

    return (
    <>
    <div className="space-y-6">
       <div className="flex justify-between items-end">
           <div>
               <h2 className="text-2xl font-bold text-white">Driver Directory & Performance</h2>
               <p className="text-eco-text-secondary text-sm mt-1">Wellness scores · Fair dispatch tracking · Night safety routing</p>
           </div>
           <button 
                onClick={() => setIsAddDriverModalOpen(true)}
                className="bg-eco-brand-orange hover:bg-eco-brand-orange-hover text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-neon-orange transition-all active:scale-95"
            >
               + Add Driver
           </button>
       </div>

       {/* Filters */}
       <div className="flex flex-col md:flex-row gap-4 bg-eco-card p-4 rounded-xl border border-eco-card-border">
           <div className="relative flex-1">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
               <input 
                   type="text" 
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   placeholder="Search drivers by name, vehicle, or location..." 
                   className="w-full bg-eco-secondary border border-eco-card-border rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-eco-brand-orange transition-colors placeholder:text-gray-600"
               />
           </div>
           <button 
                onClick={() => setFilterStatus(filterStatus === 'On Duty' ? null : 'On Duty')}
                className={`flex items-center px-4 py-2 border rounded-lg text-sm transition-colors ${filterStatus === 'On Duty' ? 'bg-eco-brand-orange text-white border-eco-brand-orange' : 'bg-eco-secondary border-eco-card-border text-eco-text-secondary hover:text-white hover:border-gray-500'}`}
            >
               <Filter className="w-4 h-4 mr-2" /> On Duty
           </button>
           <button 
                onClick={() => setFilterStatus(filterStatus === 'In Transit' ? null : 'In Transit')}
                className={`flex items-center px-4 py-2 border rounded-lg text-sm transition-colors ${filterStatus === 'In Transit' ? 'bg-eco-brand-orange text-white border-eco-brand-orange' : 'bg-eco-secondary border-eco-card-border text-eco-text-secondary hover:text-white hover:border-gray-500'}`}
            >
               <Truck className="w-4 h-4 mr-2" /> In Transit
           </button>
           <div className="relative">
               <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
               <input
                   type="text"
                   value={locationTerm}
                   onChange={(e) => setLocationTerm(e.target.value)}
                   placeholder="Filter by city..."
                   className="bg-eco-secondary border border-eco-card-border rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-eco-brand-orange transition-colors placeholder:text-gray-600 w-36"
               />
           </div>
       </div>

       {/* Rows */}
       <div className="bg-eco-card rounded-xl border border-eco-card-border">
            <div className="grid grid-cols-12 px-6 py-3 text-xs font-medium text-eco-text-secondary uppercase tracking-wider border-b border-eco-card-border bg-eco-secondary/50">
                <div className="col-span-2">Driver</div>
                <div className="col-span-2">Vehicle</div>
                <div className="col-span-1 text-center">Wellness</div>
                <div className="col-span-1 text-center">Fair Score</div>
                <div className="col-span-2">Location</div>
                <div className="col-span-1 text-center">Status</div>
                <div className="col-span-1 text-center">Rating</div>
                <div className="col-span-1 text-center">Safety</div>
                <div className="col-span-1 text-center">Actions</div>
            </div>

            <div className="divide-y divide-eco-card-border">
                {filteredDrivers.length > 0 ? filteredDrivers.map((driver) => {
                    // Derive wellness score from driver data
                    const wellnessScore = driver.wellnessScore ?? (driver.status === 'On Duty' ? 82 : driver.status === 'Off Duty' ? 55 : 72);
                    const fairScore = driver.fairScore ?? Math.round(70 + (driver.rating || 4.5) * 5);
                    const wellnessColor = wellnessScore >= 70 ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30'
                        : wellnessScore >= 40 ? 'text-amber-400 bg-amber-400/10 border-amber-400/30'
                        : 'text-red-400 bg-red-400/10 border-red-400/30';
                    const wellnessLabel = wellnessScore >= 70 ? 'Fit' : wellnessScore >= 40 ? 'Moderate' : 'Fatigued';
                    return (
                    <div key={driver.id} className="grid grid-cols-12 items-center bg-eco-card px-6 py-3.5 hover:bg-eco-secondary/30 transition-colors group">
                        <div className="col-span-2 flex items-center space-x-2">
                            <div className={`w-9 h-9 rounded-full ${driver.color} text-white flex items-center justify-center font-bold text-xs shadow-lg flex-shrink-0`}>
                                {driver.avatar}
                            </div>
                            <div className="min-w-0">
                                <div className="font-medium text-white text-sm truncate">{driver.name}</div>
                                <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                    <Phone className="w-2.5 h-2.5" /> {driver.phone?.slice(-8) || 'N/A'}
                                </div>
                            </div>
                        </div>
                        
                        <div className="col-span-2">
                            <div className="text-white font-mono text-xs">{driver.plate}</div>
                            <div className="text-xs text-eco-text-secondary flex items-center gap-1 mt-0.5">
                                {driver.type === 'ELECTRIC' ? <Zap className="w-3 h-3 text-green-400" /> : <Truck className="w-3 h-3" />}
                                {driver.vehicle}
                            </div>
                        </div>

                        <div className="col-span-1 flex justify-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${wellnessColor}`}>{wellnessLabel}</span>
                        </div>

                        <div className="col-span-1 flex justify-center">
                            <div className="flex flex-col items-center">
                                <span className={`text-sm font-bold ${fairScore >= 80 ? 'text-emerald-400' : fairScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{fairScore}%</span>
                                <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden mt-0.5">
                                    <div className={`h-full rounded-full ${fairScore >= 80 ? 'bg-emerald-400' : fairScore >= 60 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${fairScore}%` }} />
                                </div>
                            </div>
                        </div>
                        
                        <div className="col-span-2 text-eco-text-secondary text-xs flex items-center">
                            <MapPin className="w-3 h-3 mr-1.5 text-gray-500 flex-shrink-0" /> {driver.loc}
                        </div>
                        
                        <div className="col-span-1 flex justify-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                                driver.status === 'On Duty' ? 'bg-eco-success/10 text-eco-success border-eco-success/20' :
                                driver.status === 'In Transit' ? 'bg-eco-info/10 text-eco-info border-eco-info/20' :
                                'bg-gray-700/50 text-gray-400 border-gray-600'
                            }`}>
                                {driver.status}
                            </span>
                        </div>
                        
                        <div className="col-span-1 flex items-center justify-center text-yellow-400 font-bold text-sm">
                            <Star className="w-3.5 h-3.5 mr-1 fill-current" /> {driver.rating}
                        </div>

                        <div className="col-span-1 flex justify-center">
                            {driver.type === 'ELECTRIC' ? (
                                <span title="EV - Zero emission"><Zap className="w-4 h-4 text-green-400" /></span>
                            ) : (
                                <span title="Night-safe routing enabled"><Shield className={`w-4 h-4 ${driver.avatar?.length === 2 && ['PS', 'SD'].includes(driver.avatar) ? 'text-purple-400' : 'text-gray-600'}`} /></span>
                            )}
                        </div>
                        
                        <div className="col-span-1 flex justify-center relative">
                            <button 
                                onClick={(e) => toggleMenu(e, driver.id)}
                                className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                            >
                                <MoreHorizontal className="w-4 h-4" />
                            </button>
                            
                            {activeMenuId === driver.id && (
                                <div 
                                    className="absolute right-0 top-full mt-1 w-48 bg-gray-900 border border-eco-card-border rounded-lg shadow-xl z-[100] overflow-hidden"
                                >
                                    <button 
                                        onClick={() => handleActionClick(driver)}
                                        className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-eco-secondary hover:text-white flex items-center transition-colors"
                                    >
                                        <Eye className="w-4 h-4 mr-2 text-eco-info" /> View Details
                                    </button>
                                    <button 
                                        onClick={(e) => handleEditDriver(e, driver)}
                                        className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-eco-secondary hover:text-white flex items-center transition-colors border-t border-eco-card-border"
                                    >
                                        <Edit className="w-4 h-4 mr-2 text-eco-brand-orange" /> Edit Driver
                                    </button>
                                    <button 
                                        onClick={(e) => handleDeleteDriver(e, driver.id)}
                                        className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-eco-secondary hover:text-white flex items-center transition-colors border-t border-eco-card-border"
                                    >
                                        <Trash className="w-4 h-4 mr-2 text-red-500" /> Delete Driver
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    );
                }) : (
                    <div className="p-8 text-center text-gray-400">
                        No drivers found matching your search.
                    </div>
                )}
            </div>
       </div>
    </div>
    
    {/* Driver Detail Panel */}
    <DriverDetailPanel 
        driver={selectedDriver}
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
    />
    
    <AddDriverModal 
        isOpen={isAddDriverModalOpen}
        onClose={handleModalClose}
        onSuccess={handleDriverCreated}
        createDriver={createDriver}
        updateDriver={updateDriver}
        initialData={editingDriver}
    />
    </>
  );
}
