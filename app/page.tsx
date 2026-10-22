import Hero from "@/components/Hero";
import Nav from "@/components/Nav";
import Stage from "@/components/Stage";
import Work from "@/components/Work";

export default function Home() {
  return <Stage nav={<Nav />} hero={<Hero />} work={<Work />} />;
}
