'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Spinner } from '@/components/ui/spinner';
import Link from 'next/link';
import { 
  Column, Line, Area, Pie, DualAxes, Scatter, 
  Rose, Radar, Gauge, Waterfall, WordCloud 
} from '@ant-design/charts';
import { EditOutlined, DeleteOutlined, AppstoreOutlined, SaveOutlined } from '@ant-design/icons';
import GridLayout, { Layout, Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// Define widget type
interface Widget {
  id: number;
  name: string;
  type: string;
  config: any;
  position?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

interface Dashboard {
  id: number;
  name: string;
  description: string | null;
  space: {
    id: number;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  isPublic?: boolean;
}

interface DashboardPageProps {
  dashboard: Dashboard;
}

const ResponsiveGridLayout = WidthProvider(Responsive);

interface GridLayoutProps {
  widgets: Widget[];
  dashboardId: number;
  onRenderWidget: (widget: Widget) => React.ReactNode;
}

function GridLayoutComponent({ widgets, dashboardId, onRenderWidget }: GridLayoutProps) {
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Convert widgets to layout items
  const [layouts, setLayouts] = useState(() => {
    // Debug log for widget positions
    console.log("Initial widget positions:", widgets.map(w => ({ 
      id: w.id, 
      name: w.name,
      position: w.position 
    })));
    
    const layoutItems = widgets.map(widget => {
      // Ensure position exists
      const position = widget.position || {};
      
      // Create a layout item with the saved position or defaults
      const item = {
        i: widget.id.toString(),
        x: position.x !== undefined ? position.x : 0,
        y: position.y !== undefined ? position.y : 0,
        w: position.w !== undefined ? position.w : 6,
        h: position.h !== undefined ? position.h : 4,
        minW: 2,
        minH: 2,
      };
      
      console.log(`Widget ${widget.id} (${widget.name}) layout:`, item);
      return item;
    });
    
    // Create separate layouts for each breakpoint for better responsiveness
    return { 
      lg: layoutItems,
      md: layoutItems.map(item => ({...item})),
      sm: layoutItems.map(item => ({...item}))
    };
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  // Save updated layout positions to database
  const saveLayout = async () => {
    try {
      setIsSaving(true);
      setSaveMessage('');
      
      // For each widget, update its position in the database
      const updatePromises = widgets.map(async (widget) => {
        const layoutItem = layouts.lg.find(item => item.i === widget.id.toString());
        
        if (!layoutItem) {
          console.warn(`No layout found for widget ${widget.id}`);
          return Promise.resolve();
        }
        
        // Create position object with explicit values
        const position = {
          x: parseInt(layoutItem.x.toString()),
          y: parseInt(layoutItem.y.toString()),
          w: parseInt(layoutItem.w.toString()),
          h: parseInt(layoutItem.h.toString())
        };
        
        // Log what we're saving for debugging
        console.log(`Saving widget ${widget.id} (${widget.name}) position:`, JSON.stringify(position));
        
        // Make the API request to update the widget
        const response = await fetch(`/api/widgets/${widget.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dashboardId,
            position
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to save widget ${widget.id} position: ${errorText}`);
        }
        
        return response;
      });
      
      // Wait for all updates to complete
      await Promise.all(updatePromises);
      
      // Set success message
      setSaveMessage('Layout saved successfully');
      setTimeout(() => setSaveMessage(''), 3000);
      
      // Turn off edit mode after saving
      if (isEditMode) {
        setIsEditMode(false);
      }
    } catch (error) {
      console.error('Error saving layout:', error);
      setSaveMessage('Failed to save layout. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle layout change - just update layouts without auto-saving
  const onLayoutChange = (currentLayout: Layout[], allLayouts: any) => {
    // Only update layouts if in edit mode
    if (isEditMode) {
      setLayouts(allLayouts);
      // No auto-saving - we'll only save when "Done Editing" is clicked
    }
  };
  
  // Toggle edit mode
  const toggleEditMode = () => {
    if (isEditMode) {
      // Save layout before turning off edit mode
      saveLayout();
    } else {
      setIsEditMode(true);
    }
  };
  
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <button 
            onClick={toggleEditMode}
            className={`${
              isEditMode 
                ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                : 'bg-muted hover:bg-muted/90 text-foreground'
            } px-4 py-2 rounded-md text-sm font-medium inline-flex items-center transition-colors`}
          >
            {isEditMode ? (
              <>
                <SaveOutlined style={{ marginRight: 8 }} />
                Done Editing
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
                  <path d="M2 17a5 5 0 0 0 10 0c0-2.5-2.5-5-5-5a5 5 0 0 0-5 5Z" />
                  <path d="M12 17a5 5 0 0 0 10 0c0-2.5-2.5-5-5-5a5 5 0 0 0-5 5Z" />
                  <path d="M7 7a5 5 0 1 0-5 5" />
                  <path d="M17 7a5 5 0 1 0-5 5" />
                </svg>
                Edit Layout
              </>
            )}
          </button>
          
          {isEditMode && (
            <span className="ml-4 text-sm text-muted-foreground">
              Drag widgets to reposition or resize them
            </span>
          )}
        </div>
        
        {isSaving && (
          <div className="flex items-center">
            <div className="animate-spin mr-2 h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
            <span className="text-sm">Saving layout...</span>
          </div>
        )}
        
        {saveMessage && (
          <div className={`px-4 py-2 rounded-md text-sm ${saveMessage.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {saveMessage}
          </div>
        )}
      </div>
      
      {isEditMode && (
        <div className="mb-4 p-2 border border-amber-500 bg-amber-50 text-amber-800 rounded-md text-sm">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z" />
            </svg>
            Edit mode is active. Drag widgets by their headers or resize from the corners and edges.
          </div>
        </div>
      )}
      
      <ResponsiveGridLayout
        className={`layout ${isEditMode ? 'edit-mode' : ''}`}
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={60}
        containerPadding={[15, 15]}
        margin={[15, 15]}
        onLayoutChange={onLayoutChange}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        useCSSTransforms={true}
        isBounded={false}
        draggableHandle=".drag-handle"
      >
        {widgets.map(widget => (
          <div
            key={widget.id.toString()}
            className={`border rounded-lg overflow-hidden bg-card shadow-sm transition-all ${
              isEditMode ? 'border-amber-500 border-dashed shadow-md' : ''
            }`}
          >
            <div className={`p-4 border-b flex items-center justify-between ${isEditMode ? 'drag-handle cursor-move bg-amber-50' : ''}`}>
              <div>
                <h3 className="font-medium">{widget.name}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <Link
                  href={`/dashboard/${dashboardId}/edit-widget/${widget.id}`}
                  className="h-6 w-6 rounded-full text-muted-foreground hover:text-foreground flex items-center justify-center"
                  aria-label="Edit widget"
                >
                  <EditOutlined />
                </Link>
                <button 
                  className="h-6 w-6 rounded-full text-muted-foreground hover:text-destructive"
                  aria-label="Delete widget"
                >
                  <DeleteOutlined />
                </button>
              </div>
            </div>
            
            <div className="overflow-auto" style={{ height: 'calc(100% - 57px)' }}>
              {onRenderWidget(widget)}
            </div>
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}

export function DashboardViewClient({ dashboard }: DashboardPageProps) {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Define chart colors
  const chartColors = [
    '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', 
    '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107'
  ];
  
  // Fetch widgets for this dashboard
  useEffect(() => {
    const fetchWidgets = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/dashboards/${dashboard.id}/widgets`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch widgets');
        }
        
        const data = await response.json();
        setWidgets(data.widgets || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching widgets:', err);
        setError('Failed to load widgets. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchWidgets();
  }, [dashboard.id]);
  
  // Render a bar chart
  const renderBarChart = (widget: Widget, data: any[]) => {
    const { config } = widget;
    
    const barConfig = {
      data,
      xField: config.xAxis || 'name',
      yField: config.yAxis || 'value',
      seriesField: config.groupBy,
      isStack: config.isStacked,
      label: config.showLabel ? {} : undefined,
      color: config.colors || chartColors,
      // Make the chart fully responsive
      autoFit: true,
      appendPadding: [8, 8, 8, 8],
      columnStyle: {
        radius: [4, 4, 0, 0],
      },
      legend: {
        visible: config.showLegend !== false,
        position: 'top-right',
      },
      xAxis: {
        title: { text: config.xAxisLabel || '' },
        grid: { line: { style: { stroke: config.showGrid ? '#d9d9d9' : 'transparent' } } },
      },
      yAxis: {
        title: { text: config.yAxisLabel || '' },
        grid: { line: { style: { stroke: config.showGrid ? '#d9d9d9' : 'transparent' } } },
      },
      tooltip: {
        showContent: config.showTooltip !== false,
      },
    };
    
    return <Column {...barConfig} />;
  };
  
  // Render a line chart
  const renderLineChart = (widget: Widget, data: any[]) => {
    const { config } = widget;
    
    const lineConfig = {
      data,
      xField: config.xAxis || 'date',
      yField: config.yAxis || 'value',
      seriesField: config.groupBy,
      smooth: true,
      // Make the chart fully responsive
      autoFit: true,
      appendPadding: [8, 8, 8, 8],
      color: config.colors || chartColors,
      lineStyle: { lineWidth: 2 },
      point: {
        size: 5,
        shape: 'circle',
        style: { fillOpacity: 0.8 },
      },
      legend: {
        visible: config.showLegend !== false,
        position: 'top-right',
      },
      xAxis: {
        title: { text: config.xAxisLabel || '' },
        grid: { line: { style: { stroke: config.showGrid ? '#d9d9d9' : 'transparent' } } },
      },
      yAxis: {
        title: { text: config.yAxisLabel || '' },
        grid: { line: { style: { stroke: config.showGrid ? '#d9d9d9' : 'transparent' } } },
      },
      tooltip: {
        showContent: config.showTooltip !== false,
      },
    };
    
    return <Line {...lineConfig} />;
  };
  
  // Render an area chart
  const renderAreaChart = (widget: Widget, data: any[]) => {
    const { config } = widget;
    
    const areaConfig = {
      data,
      xField: config.xAxis || 'date',
      yField: config.yAxis || 'value',
      seriesField: config.groupBy,
      isStack: config.isStacked,
      smooth: true,
      // Make the chart fully responsive
      autoFit: true,
      appendPadding: [8, 8, 8, 8],
      color: config.colors || chartColors,
      areaStyle: { fillOpacity: 0.6 },
      legend: {
        visible: config.showLegend !== false,
        position: 'top-right',
      },
      xAxis: {
        title: { text: config.xAxisLabel || '' },
        grid: { line: { style: { stroke: config.showGrid ? '#d9d9d9' : 'transparent' } } },
      },
      yAxis: {
        title: { text: config.yAxisLabel || '' },
        grid: { line: { style: { stroke: config.showGrid ? '#d9d9d9' : 'transparent' } } },
      },
      tooltip: {
        showContent: config.showTooltip !== false,
      },
    };
    
    return <Area {...areaConfig} />;
  };
  
  // Render a pie chart
  const renderPieChart = (widget: Widget, data: any[]) => {
    const { config } = widget;
    
    const pieConfig = {
      data,
      angleField: config.yAxis || 'value',
      colorField: config.xAxis || 'name',
      color: config.colors || chartColors,
      // Make the chart fully responsive
      autoFit: true,
      appendPadding: [8, 8, 8, 8],
      radius: 0.8,
      innerRadius: config.innerRadius || 0,
      label: {
        type: 'outer',
        content: config.showLabel !== false ? '{name}: {percentage}' : '',
      },
      legend: {
        visible: config.showLegend !== false,
        position: 'top-right',
      },
      tooltip: {
        showContent: config.showTooltip !== false,
      },
      interactions: [{ type: 'element-active' }],
    };
    
    return <Pie {...pieConfig} />;
  };
  
  // Sample data for testing - replace with real data loading
  const getSampleData = (widget: Widget) => {
    const sampleDataMap = {
      bar: [
        { name: 'Jan', value: 400 },
        { name: 'Feb', value: 300 },
        { name: 'Mar', value: 600 },
        { name: 'Apr', value: 800 },
        { name: 'May', value: 500 }
      ],
      line: [
        { date: 'Jan', value: 400 },
        { date: 'Feb', value: 300 },
        { date: 'Mar', value: 600 },
        { date: 'Apr', value: 800 },
        { date: 'May', value: 500 }
      ],
      pie: [
        { name: 'Group A', value: 400 },
        { name: 'Group B', value: 300 },
        { name: 'Group C', value: 300 },
        { name: 'Group D', value: 200 }
      ],
      area: [
        { date: 'Jan', value: 400 },
        { date: 'Feb', value: 300 },
        { date: 'Mar', value: 600 },
        { date: 'Apr', value: 800 },
        { date: 'May', value: 500 }
      ],
      text: []
    };
    
    const config = widget.config || {};
    const chartType = config.chartType || 'bar';
    return sampleDataMap[chartType] || [];
  };
  
  // Render widget based on type
  const renderWidget = (widget: Widget) => {
    const { type, config = {} } = widget;
    
    // For text widget type
    if (type === 'text') {
      return (
        <div className="h-full p-4 overflow-auto w-full">
          <div className="prose max-w-none w-full h-full">
            {config.textContent?.split('\n').map((line: string, i: number) => (
              <p key={i} className="break-words">{line || <br />}</p>
            )) || (
              <p className="text-muted-foreground">No content available</p>
            )}
          </div>
        </div>
      );
    }
    
    // For chart widget type
    if (type === 'chart') {
      const chartType = config.chartType || 'bar';
      const sampleData = getSampleData(widget);
      
      // Set chart to fill container completely and be responsive
      const chartContainerStyle = { 
        height: '100%', 
        width: '100%',
        display: 'flex', 
        flexDirection: 'column' as const,
        padding: '0px',
        overflow: 'hidden'
      };
      
      // Render different chart types
      return (
        <div style={chartContainerStyle}>
          {(() => {
            switch (chartType) {
              case 'bar':
                return renderBarChart(widget, sampleData);
              case 'line':
                return renderLineChart(widget, sampleData);
              case 'area':
                return renderAreaChart(widget, sampleData);
              case 'pie':
                return renderPieChart(widget, sampleData);
              default:
                return (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <AppstoreOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
                      <p>Unsupported chart type: {chartType}</p>
                    </div>
                  </div>
                );
            }
          })()}
        </div>
      );
    }
    
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <AppstoreOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
          <p>Unsupported widget type: {type}</p>
        </div>
      </div>
    );
  };

  return (
    <>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          {error}
        </div>
      ) : widgets.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="col-span-full border border-dashed rounded-lg p-8 bg-muted/50 flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-1">No widgets yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">
              Add your first widget to start visualizing your data.
            </p>
            <a
              href={`/dashboard/${dashboard.id}/add-widget`}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium inline-flex items-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2"
              >
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              Add Widget
            </a>
          </div>
        </div>
      ) : (
        <GridLayoutComponent widgets={widgets} dashboardId={dashboard.id} onRenderWidget={renderWidget} />
      )}
    </>
  );
}