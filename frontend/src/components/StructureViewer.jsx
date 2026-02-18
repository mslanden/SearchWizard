"use client";

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function StructureViewer({ isOpen, onClose, structure }) {
  if (!structure) return null;
  
  // Check if this is a V2 template structure
  const isV2Template = structure.templatePrompt || structure.visualData;
  
  // Format the structure sections for better display (legacy format)
  const formatSections = (sections) => {
    if (!sections || !Array.isArray(sections)) return 'No sections found';
    
    return sections.map((section, index) => (
      <div key={index} className="mb-4 border-l-4 border-blue-500 pl-4">
        <h3 className="font-bold text-gray-900 text-lg">{section.name || 'Unnamed Section'}</h3>
        <p className="text-gray-700 mb-2">{section.description || 'No description'}</p>
        <div className="bg-gray-100 p-3 rounded">
          <p className="text-sm font-medium text-gray-500">Typical Content:</p>
          <p className="whitespace-pre-wrap text-gray-800">{section.typical_content || 'No content specified'}</p>
        </div>
      </div>
    ));
  };
  
  // Format V2 template data for display
  const formatV2Template = () => {
    return (
      <div className="space-y-6">
        {/* Template Information */}
        <div className="mb-6">
          <h2 className="text-xl text-gray-900 font-bold mb-2">Template Information</h2>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-blue-700 mb-1">Template Name:</p>
            <p className="text-blue-900">{structure.name || 'Unnamed Template'}</p>
            <p className="text-sm font-medium text-blue-700 mb-1 mt-3">Document Type:</p>
            <p className="text-blue-900">{structure.type || 'Not specified'}</p>
            {structure.hasVisualAnalysis && (
              <div className="mt-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  ✨ Visual Analysis Available
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Template Prompt */}
        {structure.templatePrompt && (
          <div className="mb-6">
            <h2 className="text-xl text-gray-900 font-bold mb-2">Template Instructions</h2>
            <div className="bg-purple-50 p-4 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm text-purple-900 font-mono">
                {structure.templatePrompt}
              </pre>
            </div>
          </div>
        )}
        
        {/* Visual Analysis Data */}
        {structure.visualData && Object.keys(structure.visualData).length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl text-gray-900 font-bold mb-2">Visual Analysis</h2>
            <div className="bg-green-50 p-4 rounded-lg">
              {Object.entries(structure.visualData).map(([key, value]) => (
                <div key={key} className="mb-3 last:mb-0">
                  <p className="text-sm font-medium text-green-700 capitalize">
                    {key.replace(/_/g, ' ')}:
                  </p>
                  <p className="text-green-900 ml-2">
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-between items-center mb-6">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    {isV2Template ? 'Template Structure' : 'Document Structure Template'}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="rounded-md p-1 hover:bg-gray-200 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6 text-gray-500" />
                  </button>
                </div>
                
                <div className="overflow-y-auto max-h-[70vh]">
                  {isV2Template ? (
                    // V2 Template Format
                    <>
                      {formatV2Template()}
                      
                      <div className="mt-8">
                        <h3 className="text-lg text-gray-900 font-bold mb-2">Raw Template Data</h3>
                        <div className="bg-gray-100 text-gray-700 p-4 rounded-md">
                          <pre className="whitespace-pre-wrap text-sm overflow-x-auto">
                            {JSON.stringify(structure, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </>
                  ) : (
                    // Legacy Format (old golden examples)
                    <>
                      <div className="mb-6">
                        <h2 className="text-xl text-gray-900 font-bold mb-2">Document Type</h2>
                        <p className="text-lg text-gray-700">{structure.document_type || 'Not specified'}</p>
                      </div>
                      
                      <div className="mb-6">
                        <h2 className="text-xl text-gray-900 font-bold mb-2">Overall Tone</h2>
                        <p className="text-lg text-gray-700">{structure.overall_tone || 'Not specified'}</p>
                      </div>
                      
                      <div className="mb-6">
                        <h2 className="text-xl text-gray-900 font-bold mb-2">Formatting Notes</h2>
                        <p className="text-lg text-gray-700 whitespace-pre-wrap">{structure.formatting_notes || 'Not specified'}</p>
                      </div>
                      
                      <div className="mb-6">
                        <h2 className="text-xl text-gray-900 font-bold mb-2">Sections</h2>
                        <div className="mt-4 text-gray-700">
                          {formatSections(structure.sections)}
                        </div>
                      </div>
                      
                      <div className="mt-8">
                        <h3 className="text-lg text-gray-900 font-bold mb-2">Raw JSON Structure</h3>
                        <div className="bg-gray-100 text-gray-700 p-4 rounded-md">
                          <pre className="whitespace-pre-wrap text-sm overflow-x-auto">
                            {JSON.stringify(structure, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    onClick={onClose}
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
