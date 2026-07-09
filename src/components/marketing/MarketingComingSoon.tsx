import { Sparkles } from "lucide-react";

interface Props {
  title: string;
  description: string;
}

const MarketingComingSoon = ({ title, description }: Props) => (
  <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4">
      <Sparkles className="w-6 h-6" />
    </div>
    <h2 className="text-xl font-bold mb-2">{title}</h2>
    <p className="text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
  </div>
);

export default MarketingComingSoon;