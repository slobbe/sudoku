import { ContentPage } from "@/components/ContentPage";

type TechniqueTemplateProps = {
  title: string;
  description: string;
};

export function TechniqueTemplate({ title, description }: TechniqueTemplateProps) {
  return (
    <ContentPage
      title={title}
      description={description}
      ctaHref="/play"
      ctaLabel="Practice on /play"
    />
  );
}
