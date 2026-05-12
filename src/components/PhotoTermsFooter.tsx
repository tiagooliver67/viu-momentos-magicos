interface Props {
  className?: string;
}

export default function PhotoTermsFooter({ className = "" }: Props) {
  return (
    <div className={`text-center px-4 py-6 border-t border-border ${className}`}>
      <p className="text-sm font-bold text-foreground mb-2">TERMO DE USO DAS FOTOS</p>
      <p className="text-xs text-muted-foreground max-w-3xl mx-auto leading-relaxed">
        As fotos disponibilizadas são para uso exclusivamente pessoal, incluindo
        divulgação em redes sociais. Não é permitida a comercialização das mesmas,
        assim como a divulgação editorial, publicitária e qualquer outro fim sem
        autorização por escrito da VIUFOTO e do(s) fotografado(s) (Lei 9.610/98).
      </p>
    </div>
  );
}