const ClippedImage = ({ image, className }) => {
  return (
    <div className={`relative w-full h-64 overflow-hidden ${className}`}>
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          width: "100%",
          // border: "1px solid red",
          backgroundImage: `url("/${image}")`,
          backgroundPosition: "center -65%",
          // backgroundPosition: "center -115%",
          backgroundSize: "50%", // Adjust the size to scale the image
          // backgroundPosition: "center", // Keep it centered
          // clipPath: "polygon(30% 0%, 100% 0%, 100% 50%, 0% 40%)",
          clipPath: "polygon(25% 0%, 100% 0%, 100% 46%, 25% 46%)",
          transform: "scale(1.3)", // Zooms the image by 20%
          // transform: "translateY(-10%)",
          overflow: "hidden",
          // transform: "scale(.9)", // Scale down the image
          // transform: "matrix(3 1 -1 3 30 40)",
          // transform: "rotate(150deg)",
          // transformOrigin: "center", // Ensure scaling happens from the center
        }}
      />
    </div>
  );
};

export default ClippedImage;
