import { ImageWithFallback } from './figma/ImageWithFallback';
import constructionImage from 'figma:asset/ab32438df9fc053c82955be488226b9aad17d383.png';

export function Products() {
  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-5">
        <div>
          <h1 className="text-[20px] tracking-tight mb-1">Products</h1>
          <p className="text-[13px] text-gray-500">Product management coming soon</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center py-12">
        <div className="text-center max-w-lg mx-auto px-4">
          <ImageWithFallback
            src={constructionImage}
            alt="Under Construction"
            className="w-full h-auto mb-8"
          />
          <h2 className="text-[24px] mb-3 tracking-tight">Under Construction</h2>
          <p className="text-[14px] text-gray-500 mb-2">We're working hard to bring you this feature.</p>
          <p className="text-[13px] text-gray-400">Check back soon!</p>
        </div>
      </div>
    </div>
  );
}