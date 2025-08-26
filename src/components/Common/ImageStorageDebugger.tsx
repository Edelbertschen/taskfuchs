import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { formatFileSize, resolveImageUrls, parseImageReferences } from '../../utils/imageStorage';
import { Image, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface ImageStorageDebuggerProps {
  onClose: () => void;
}

export function ImageStorageDebugger({ onClose }: ImageStorageDebuggerProps) {
  const { state, dispatch } = useApp();
  const [testContent, setTestContent] = useState('');
  const [resolvedContent, setResolvedContent] = useState('');
  const [references, setReferences] = useState<any[]>([]);

  useEffect(() => {
    // Test content with storage URLs
    const testMarkdown = `
# Test Bilder

Hier sind einige Test-Bilder:

${state.imageStorage.images.map(img => `![${img.originalName}](storage://${img.id})`).join('\n')}
`;
    
    setTestContent(testMarkdown);
    setResolvedContent(resolveImageUrls(testMarkdown, state.imageStorage));
    setReferences(parseImageReferences(testMarkdown));
  }, [state.imageStorage]);

  const handleTestPaste = async () => {
    // Create a simple test image (blue square SVG)
    const testSvg = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#3b82f6"/>
      <text x="50" y="50" text-anchor="middle" dy="0.3em" fill="white" font-family="Arial" font-size="12">TEST</text>
    </svg>`;
    
    // Convert to base64
    const testImage = 'data:image/svg+xml;base64,' + btoa(testSvg);
    
    try {
      // Create a blob to simulate a real image file
      const response = await fetch(testImage);
      const blob = await response.blob();
      const file = new File([blob], 'test-image.svg', { type: 'image/svg+xml' });
      
      // Add to image storage
      const { addImageToStorage } = await import('../../utils/imageStorage');
      const result = await addImageToStorage(file, state.imageStorage);
      
             // Update storage in context
       dispatch({ type: 'SET_IMAGE_STORAGE', payload: result.updatedStorage });
      
      console.log('✅ Test image added successfully:', result.image.id);
    } catch (error) {
      console.error('❌ Failed to add test image:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <Image className="w-6 h-6 mr-2" />
            Image Storage Debugger
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Storage Stats */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Storage Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {state.imageStorage.images.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Bilder</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatFileSize(state.imageStorage.totalSize)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Verwendet</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {formatFileSize(state.imageStorage.maxSize)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Maximum</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {Math.round((state.imageStorage.totalSize / state.imageStorage.maxSize) * 100)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Ausgelastet</div>
              </div>
            </div>
          </div>

          {/* Stored Images */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Gespeicherte Bilder</h3>
            {state.imageStorage.images.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Keine Bilder gespeichert</p>
                <button
                  onClick={handleTestPaste}
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Test Bild hinzufügen
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {state.imageStorage.images.map((image, index) => (
                  <div key={image.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <img 
                        src={image.data} 
                        alt={image.originalName}
                        className="w-12 h-12 object-cover rounded border border-gray-200 dark:border-gray-600"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBzdHJva2U9IiNmODc5NzEiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIvPgo8L3N2Zz4K';
                        }}
                      />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {image.originalName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {formatFileSize(image.size)} • {image.width}x{image.height}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          ID: {image.id}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {image.usageCount} Verwendungen
                      </div>
                      {image.usageCount > 0 ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Test Resolution */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">URL Resolution Test</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">Original Content:</h4>
                <pre className="text-sm bg-gray-100 dark:bg-gray-600 p-3 rounded overflow-x-auto">
                  {testContent}
                </pre>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">Resolved Content:</h4>
                <pre className="text-sm bg-gray-100 dark:bg-gray-600 p-3 rounded overflow-x-auto">
                  {resolvedContent}
                </pre>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">Found References:</h4>
                <div className="text-sm bg-gray-100 dark:bg-gray-600 p-3 rounded">
                  {references.length === 0 ? (
                    <span className="text-gray-500">Keine Referenzen gefunden</span>
                  ) : (
                    references.map((ref, index) => (
                      <div key={index} className="mb-1">
                        <code>{ref.markdownSrc}</code> → <code>{ref.imageId}</code>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          {resolvedContent && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Preview</h3>
              <div className="bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-600">
                <div dangerouslySetInnerHTML={{ 
                  __html: resolvedContent.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, 
                    '<img src="$2" alt="$1" style="max-width: 200px; max-height: 200px; object-fit: contain; border-radius: 8px; border: 1px solid #ddd;" />'
                  ) 
                }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 