import React, { useRef, useState } from 'react';
import { Upload, X, Loader2, Image, Video } from 'lucide-react';
import { insforge } from '../../lib/insforge';

interface FileUploadProps {
    value: string;
    onChange: (url: string) => void;
    bucket?: string;
    folder?: string;
    accept?: string;
    placeholder?: string;
    label?: string;
    maxSizeMB?: number;
}

export default function FileUpload({ 
    value, 
    onChange, 
    bucket = 'ejercicios',
    folder = 'uploads',
    accept = 'image/*',
    placeholder = 'Arrastra o selecciona un archivo',
    label,
    maxSizeMB = 10
}: FileUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    const handleFile = async (file: File) => {
        if (!file) return;
        
        // Validar tamaño (10MB por defecto)
        if (file.size > maxSizeMB * 1024 * 1024) {
            alert(`El archivo es demasiado grande (máx ${maxSizeMB}MB)`);
            return;
        }
        
        setUploading(true);
        try {
            const ext = file.name.split('.').pop() || 'jpg';
            const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
            const path = `${folder}/${filename}`;

            const { data, error } = await insforge.storage.from(bucket).upload(path, file);
            
            if (error) {
                throw error;
            }

            if (data?.url) {
                onChange(data.url);
            }
        } catch (err: any) {
            console.error('[FileUpload] Error:', err);
            alert('Error al subir archivo: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFile(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => {
        setDragOver(false);
    };

    const isImage = accept.includes('image') || !accept;
    const isVideo = accept.includes('video');

    return (
        <div>
            {label && (
                <label className="block text-sm font-medium text-gray-400 mb-2">
                    {label}
                </label>
            )}
            
            {value ? (
                <div className="relative group rounded-xl overflow-hidden border border-white/10">
                    {isVideo || value.includes('.mp4') || value.includes('video') ? (
                        <video 
                            src={value} 
                            className="w-full h-40 object-cover" 
                            controls 
                        />
                    ) : (
                        <img 
                            src={value} 
                            alt="Preview" 
                            className="w-full h-40 object-cover" 
                        />
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                        >
                            <Upload className="w-5 h-5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange('')}
                            className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-lg text-red-400 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            ) : (
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => inputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                        dragOver 
                            ? 'border-orange-500 bg-orange-500/10' 
                            : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                    }`}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept={accept}
                        onChange={handleChange}
                        className="hidden"
                    />
                    {uploading ? (
                        <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-orange-500" />
                    ) : isImage ? (
                        <Image className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                    ) : (
                        <Video className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                    )}
                    <p className="text-sm text-gray-400">{placeholder}</p>
                    <p className="text-xs text-gray-600 mt-1">Click o arrastra el archivo</p>
                </div>
            )}
        </div>
    );
}
