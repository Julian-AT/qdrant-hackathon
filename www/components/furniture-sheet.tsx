import React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "./ui/button";
import {
  AlertCircleIcon,
  Home08Icon,
  Home12Icon,
  Share08Icon,
  Sofa01Icon,
  StarIcon,
} from "hugeicons-react";
import { IkeaFurniture } from "@/lib/types";

interface FurnitureSheetProps {
  ikeaFurniture: any[];
}

const FurnitureSheet = ({ ikeaFurniture }: FurnitureSheetProps) => {
  console.log(ikeaFurniture);

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <StarIcon
            key={i}
            className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400"
          />,
        );
      } else {
        stars.push(<StarIcon key={i} className="w-3.5 h-3.5 text-gray-300" />);
      }
    }
    return stars;
  };

  return (
    <Sheet>
      <SheetTrigger>
        <Button variant="secondary">
          <Home12Icon className="size-4" />
          IKEA Furniture
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Home12Icon className="size-4" /> Ikea Items in this Scene
          </SheetTitle>
          <SheetDescription>
            Here you find all the Ikea items in this scene.
            <p className="flex gap-2 items-start mt-2">
              <AlertCircleIcon className="size-4 mt-0.5 flex-shrink-0" />
              <span>Please note that the items are not always accurate.</span>
            </p>
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-6 overflow-y-auto p-3">
          {ikeaFurniture && ikeaFurniture.length > 0 ? (
            Array.from(
              new Map(
                ikeaFurniture.map((item) => [item.payload.product_id, item]),
              ).values(),
            ).map((item) => (
              <div
                key={item.payload.product_id}
                className="bg-card border rounded-xl p-6 space-y-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex gap-5">
                  <div className="flex-shrink-0">
                    <img
                      src={item.payload.main_image_url}
                      alt={item.payload.main_image_alt}
                      className="w-24 h-24 object-cover rounded-lg bg-gray-100"
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg leading-tight">
                        {item.payload.product_name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {item.payload.description}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                      {item.payload.subcategory_name}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="font-bold text-xl">
                      ${item.payload.price}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {item.payload.currency}
                    </span>
                  </div>

                  {item.payload.rating_info && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {renderStars(item.payload.rating_info.rating)}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        ({item.payload.rating_info.review_count})
                      </span>
                    </div>
                  )}
                </div>

                <Button asChild className="w-full" variant="outline" size="lg">
                  <a
                    href={item.payload.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View on IKEA
                  </a>
                </Button>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center h-full py-16">
              <p className="text-sm text-muted-foreground">
                No Ikea items found in this scene
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FurnitureSheet;
