import React from "react";
import { VectorVisualization } from "@/components/vector-visualization";

const Page = () => {
  return (
    <div className="w-full h-screen">
      <VectorVisualization collectionName="ikea_products" maxPoints={1000} />
    </div>
  );
};

export default Page;
