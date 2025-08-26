import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { addImageToStorage, resolveImageUrls, formatFileSize } from '../../utils/imageStorage';
import { MarkdownRenderer } from './MarkdownRenderer';

export function ImageTest() {
  const { state, dispatch } = useApp();
  const [testContent, setTestContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [testResults, setTestResults] = useState<any[]>([]);

  const handleAddTestImage = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    try {
      // Test 1: Simple SVG
      const svgContent1 = `<svg width="200" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="100" fill="#3b82f6"/>
        <text x="100" y="50" text-anchor="middle" dy="0.3em" fill="white" font-family="Arial" font-size="16" font-weight="bold">TEST BILD</text>
        <text x="100" y="70" text-anchor="middle" dy="0.3em" fill="white" font-family="Arial" font-size="12">${new Date().toLocaleTimeString()}</text>
      </svg>`;

      // Test 2: Even simpler SVG
      const svgContent2 = `<svg width="100" height="50" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="50" fill="red"/>
      </svg>`;

      // Test 3: SVG with different encoding
      const svgContent3 = `<svg width="150" height="75" xmlns="http://www.w3.org/2000/svg">
        <circle cx="75" cy="37" r="30" fill="green"/>
      </svg>`;

      const svgContents = [svgContent1, svgContent2, svgContent3];
      const results = [];

      for (let i = 0; i < svgContents.length; i++) {
        const svgContent = svgContents[i];
        console.log(`\n=== TEST ${i + 1} ===`);
        console.log('SVG Content:', svgContent);
        
        // Create blob and file
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const file = new File([blob], `test-image-${i + 1}.svg`, { type: 'image/svg+xml' });
        
        console.log('File info:', { name: file.name, type: file.type, size: file.size });
        
        // Add to storage
        const result = await addImageToStorage(file, state.imageStorage);
        console.log('Storage result:', result);
        console.log('Image data preview:', result.image.data.substring(0, 200));
        
        // Test different data URL formats
        const formats = [
          result.image.data, // Original
          `data:image/svg+xml;base64,${btoa(svgContent)}`, // Manual base64
          `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`, // URL encoded
          `data:image/svg+xml,${svgContent}` // Raw SVG
        ];
        
        const formatResults = [];
        for (let j = 0; j < formats.length; j++) {
          const format = formats[j];
          const formatName = ['Storage', 'Manual Base64', 'URL Encoded', 'Raw SVG'][j];
          
          console.log(`Testing format ${formatName}:`, format.substring(0, 100));
          
          // Test if we can create an image
          const testResult = await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              console.log(`✅ ${formatName} loaded successfully`);
              resolve({ format: formatName, success: true, dataUrl: format });
            };
            img.onerror = (e) => {
              console.log(`❌ ${formatName} failed:`, e);
              resolve({ format: formatName, success: false, dataUrl: format, error: e });
            };
            img.src = format;
          });
          
          formatResults.push(testResult);
        }
        
        results.push({
          test: i + 1,
          svgContent,
          file,
          storageResult: result,
          formats: formatResults
        });
        
        // Update storage
        dispatch({ type: 'SET_IMAGE_STORAGE', payload: result.updatedStorage });
      }
      
      setTestResults(results);
      
      // Use the first successful format for display
      const firstSuccess = results.find(r => r.formats.some(f => f.success));
      if (firstSuccess) {
        const successFormat = firstSuccess.formats.find(f => f.success);
        const markdown = `# SVG Test Results\n\n## Successful Format: ${successFormat.format}\n\n![Test Image](${successFormat.dataUrl})\n\n## All Test Results:\n\n${results.map((r, i) => `### Test ${i + 1}\n\n${r.formats.map(f => `- **${f.format}**: ${f.success ? '✅ Success' : '❌ Failed'}`).join('\n')}`).join('\n\n')}`;
        
        setTestContent(markdown);
      } else {
        setTestContent('# SVG Test Results\n\n❌ All formats failed to load');
      }
      
      setDebugInfo({
        totalTests: results.length,
        successfulTests: results.filter(r => r.formats.some(f => f.success)).length,
        failedTests: results.filter(r => !r.formats.some(f => f.success)).length
      });
      
    } catch (error) {
      console.error('Error creating test image:', error);
      setTestContent(`# Error\n\nFehler beim Erstellen des Test-Bildes: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">SVG Format Tests</h2>
        
        <button
          onClick={handleAddTestImage}
          disabled={isLoading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Teste SVG Formate...' : 'SVG Format Tests starten'}
        </button>

        {debugInfo && (
          <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Debug Information</h3>
            <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
              <p><strong>Total Tests:</strong> {debugInfo.totalTests}</p>
              <p><strong>Successful Tests:</strong> {debugInfo.successfulTests}</p>
              <p><strong>Failed Tests:</strong> {debugInfo.failedTests}</p>
            </div>
          </div>
        )}

        {testResults.length > 0 && (
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Detailed Test Results</h3>
            {testResults.map((result, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 dark:text-white mb-2">Test {i + 1}</h4>
                <div className="space-y-2 text-sm">
                  {result.formats.map((format: any, j: number) => (
                    <div key={j} className={`flex items-center space-x-2 ${format.success ? 'text-green-600' : 'text-red-600'}`}>
                      <span>{format.success ? '✅' : '❌'}</span>
                      <span className="font-medium">{format.format}</span>
                      {format.success && (
                        <div className="ml-4">
                          <img 
                            src={format.dataUrl} 
                            alt={`Test ${i + 1} - ${format.format}`} 
                            className="w-16 h-8 border border-gray-300 rounded" 
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {testContent && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">MarkdownRenderer Test</h3>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <MarkdownRenderer content={testContent} />
          </div>
        </div>
      )}
    </div>
  );
} 