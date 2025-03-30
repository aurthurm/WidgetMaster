import { ChartType } from "@shared/schema";
import { getRandomColor } from "./utils";

/**
 * Utility functions for chart manipulation and configuration
 */

export interface ChartConfig {
  xAxis?: string;
  yAxis?: string;
  y2Axis?: string;
  groupBy?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc' | 'none';
  limit?: number;
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  area?: boolean;
  stacked?: boolean;
  lineType?: 'monotone' | 'linear' | 'step';
  leftAxisType?: 'bar' | 'line' | 'area';
  rightAxisType?: 'line' | 'bar' | 'area';
  innerRadius?: number;
  outerRadius?: number;
  showLabel?: boolean;
  showBubble?: boolean;
  chartTitle?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  filters?: ChartFilter[];
}

export interface ChartFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  value: string | number | boolean;
}

/**
 * Get default chart configuration for a given chart type
 */
export function getDefaultChartConfig(chartType: ChartType): ChartConfig {
  const baseConfig: ChartConfig = {
    showLegend: true,
    showGrid: true,
    showTooltip: true,
    colors: [getRandomColor(0), getRandomColor(1), getRandomColor(2), getRandomColor(3), getRandomColor(4)],
  };

  switch (chartType) {
    case 'bar':
      return {
        ...baseConfig,
        stacked: false,
      };
    case 'column':
      return {
        ...baseConfig,
        stacked: false,
      };
    case 'line':
      return {
        ...baseConfig,
        lineType: 'monotone',
        area: false,
        connectNulls: true,
      };
    case 'pie':
      return {
        ...baseConfig,
        innerRadius: 0,
        outerRadius: 80,
        showLabel: true,
      };
    case 'scatter':
      return {
        ...baseConfig,
        showBubble: false,
      };
    case 'dual-axes':
      return {
        ...baseConfig,
        leftAxisType: 'bar',
        rightAxisType: 'line',
      };
    default:
      return baseConfig;
  }
}

/**
 * Apply filters to the chart data
 */
export function applyFilters(data: Record<string, any>[], filters: ChartFilter[] = []): Record<string, any>[] {
  if (!filters || filters.length === 0) return data;

  return data.filter(item => {
    return filters.every(filter => {
      const fieldValue = item[filter.field];
      
      switch (filter.operator) {
        case 'equals':
          return fieldValue == filter.value; // Using == for type coercion
        case 'not_equals':
          return fieldValue != filter.value;
        case 'greater_than':
          return fieldValue > filter.value;
        case 'less_than':
          return fieldValue < filter.value;
        case 'contains':
          return String(fieldValue).toLowerCase().includes(String(filter.value).toLowerCase());
        default:
          return true;
      }
    });
  });
}

/**
 * Apply sorting to the chart data
 */
export function applySorting(
  data: Record<string, any>[], 
  sortBy?: string, 
  sortOrder: 'asc' | 'desc' | 'none' = 'none'
): Record<string, any>[] {
  if (!sortBy || sortOrder === 'none') return data;

  return [...data].sort((a, b) => {
    const valA = a[sortBy];
    const valB = b[sortBy];
    
    // Handle numeric comparison
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    }
    
    // Handle string comparison
    const strA = String(valA).toLowerCase();
    const strB = String(valB).toLowerCase();
    
    if (sortOrder === 'asc') {
      return strA.localeCompare(strB);
    } else {
      return strB.localeCompare(strA);
    }
  });
}

/**
 * Apply a limit to the number of data points
 */
export function applyLimit(data: Record<string, any>[], limit?: number): Record<string, any>[] {
  if (!limit || limit <= 0) return data;
  return data.slice(0, limit);
}

/**
 * Process chart data with all transformations (filters, sorting, limit)
 */
export function processChartData(
  data: Record<string, any>[], 
  config: ChartConfig
): Record<string, any>[] {
  let processedData = [...data];
  
  // Apply filters
  if (config.filters && config.filters.length > 0) {
    processedData = applyFilters(processedData, config.filters);
  }
  
  // Apply sorting
  if (config.sortBy && config.sortOrder && config.sortOrder !== 'none') {
    processedData = applySorting(processedData, config.sortBy, config.sortOrder);
  }
  
  // Apply limit
  if (config.limit && config.limit > 0) {
    processedData = applyLimit(processedData, config.limit);
  }
  
  return processedData;
}

/**
 * Get suggested chart type based on data structure
 */
export function suggestChartType(data: Record<string, any>[]): ChartType {
  if (!data || data.length === 0) return 'bar';
  
  const sampleRow = data[0];
  const fields = Object.keys(sampleRow);
  
  // Count the number of numeric and categorical fields
  let numericCount = 0;
  let categoricalCount = 0;
  
  fields.forEach(field => {
    if (typeof sampleRow[field] === 'number') {
      numericCount++;
    } else {
      categoricalCount++;
    }
  });
  
  // If there are multiple numeric fields and at least one categorical
  if (numericCount >= 2 && categoricalCount >= 1) {
    return 'dual-axes';
  }
  
  // If there's just one categorical field and one numeric field
  if (categoricalCount === 1 && numericCount === 1) {
    return 'bar';
  }
  
  // If there are multiple categories and one numeric field
  if (categoricalCount > 1 && numericCount === 1) {
    return 'column';
  }
  
  // If there's time-series data (fields contain year, month, date, etc.)
  const timeFields = fields.filter(field => {
    const lowerField = field.toLowerCase();
    return lowerField.includes('date') || 
           lowerField.includes('time') || 
           lowerField.includes('year') || 
           lowerField.includes('month') || 
           lowerField.includes('day');
  });
  
  if (timeFields.length > 0 && numericCount > 0) {
    return 'line';
  }
  
  // For data with two numeric dimensions, suggest scatter plot
  if (numericCount >= 2 && numericCount <= 3) {
    return 'scatter';
  }
  
  // For data with one categorical and one numeric field, suggest pie chart
  // if categorical field has few distinct values
  if (categoricalCount === 1 && numericCount === 1) {
    const categoricalField = fields.find(field => typeof sampleRow[field] !== 'number')!;
    const distinctValues = new Set(data.map(item => item[categoricalField])).size;
    
    if (distinctValues <= 8) {
      return 'pie';
    }
  }
  
  // Default to bar chart
  return 'bar';
}

/**
 * Suggest axis mappings based on data structure
 */
export function suggestAxisMappings(
  data: Record<string, any>[], 
  chartType: ChartType
): Pick<ChartConfig, 'xAxis' | 'yAxis' | 'y2Axis' | 'groupBy'> {
  if (!data || data.length === 0) {
    return {};
  }
  
  const sampleRow = data[0];
  const fields = Object.keys(sampleRow);
  
  // Find numeric and categorical fields
  const numericFields = fields.filter(field => typeof sampleRow[field] === 'number');
  const categoricalFields = fields.filter(field => typeof sampleRow[field] !== 'number');
  
  // Find potential time fields
  const timeFields = fields.filter(field => {
    const lowerField = field.toLowerCase();
    return lowerField.includes('date') || 
           lowerField.includes('time') || 
           lowerField.includes('year') || 
           lowerField.includes('month') || 
           lowerField.includes('day') ||
           lowerField.includes('quarter');
  });
  
  switch (chartType) {
    case 'bar':
    case 'column': {
      let xAxis = categoricalFields[0] || fields[0];
      let yAxis = numericFields[0] || fields[1] || fields[0];
      
      // If there are time fields, prefer them for x-axis
      if (timeFields.length > 0) {
        xAxis = timeFields[0];
      }
      
      // If there are multiple categorical fields, suggest groupBy
      let groupBy = undefined;
      if (categoricalFields.length > 1) {
        groupBy = categoricalFields.find(field => field !== xAxis);
      }
      
      return { xAxis, yAxis, groupBy };
    }
    
    case 'line': {
      // For line charts, prefer time fields for x-axis
      let xAxis = timeFields[0] || categoricalFields[0] || fields[0];
      let yAxis = numericFields[0] || fields[1] || fields[0];
      
      // If there are multiple numeric fields, suggest groupBy
      let groupBy = undefined;
      if (numericFields.length > 1 && categoricalFields.length > 0) {
        groupBy = categoricalFields[0];
      }
      
      return { xAxis, yAxis, groupBy };
    }
    
    case 'pie': {
      // For pie charts, categorical field for name, numeric for value
      const xAxis = categoricalFields[0] || fields[0];
      const yAxis = numericFields[0] || fields[1] || fields[0];
      return { xAxis, yAxis };
    }
    
    case 'scatter': {
      // For scatter plots, numeric fields for both axes
      const xAxis = numericFields[0] || fields[0];
      const yAxis = numericFields[1] || numericFields[0] || fields[1] || fields[0];
      
      // Use a categorical field for groupBy if available
      let groupBy = undefined;
      if (categoricalFields.length > 0) {
        groupBy = categoricalFields[0];
      }
      
      return { xAxis, yAxis, groupBy };
    }
    
    case 'dual-axes': {
      // For dual axes, we need two numeric fields and one categorical/time field
      const xAxis = timeFields[0] || categoricalFields[0] || fields[0];
      const yAxis = numericFields[0] || fields[1] || fields[0];
      const y2Axis = numericFields[1] || numericFields[0] || fields[2] || fields[1];
      
      return { xAxis, yAxis, y2Axis };
    }
    
    default:
      return {
        xAxis: fields[0],
        yAxis: fields[1] || fields[0],
      };
  }
}
