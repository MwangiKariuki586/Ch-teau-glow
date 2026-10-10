/**
 * Performance monitoring utilities for database queries
 */

const PERFORMANCE_WARNING_THRESHOLD_MS = 100;

export interface QueryMetrics {
  operation: string;
  duration: number;
  timestamp: Date;
  details?: Record<string, any>;
}

/**
 * Wraps a database query with performance monitoring
 */
export async function monitorQuery<T>(
  operation: string,
  queryFn: () => Promise<T>,
  details?: Record<string, any>
): Promise<T> {
  const startTime = performance.now();
  
  try {
    const result = await queryFn();
    const duration = performance.now() - startTime;
    
    // Log performance metrics
    logQueryMetrics({
      operation,
      duration,
      timestamp: new Date(),
      details
    });
    
    // Warn if query exceeds threshold
    if (duration > PERFORMANCE_WARNING_THRESHOLD_MS) {
      console.warn(`[PERFORMANCE WARNING] Query "${operation}" took ${duration.toFixed(2)}ms`, details);
    }
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`[QUERY ERROR] Query "${operation}" failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
}

/**
 * Logs query metrics (in production, this could send to monitoring service)
 */
function logQueryMetrics(metrics: QueryMetrics) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[QUERY METRICS] ${metrics.operation}: ${metrics.duration.toFixed(2)}ms`, metrics.details);
  }
  
  // In production, you might want to send this to a monitoring service
  // like DataDog, New Relic, or custom analytics
}