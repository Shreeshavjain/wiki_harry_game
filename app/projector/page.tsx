import type { Metadata } from "next";
import ProjectorApp from "@/components/projector/ProjectorApp";

export const metadata: Metadata = {
  title: "Projector | Wiki Tech Interactive Quiz",
};

export default function ProjectorPage() {
  return <ProjectorApp />;
}
