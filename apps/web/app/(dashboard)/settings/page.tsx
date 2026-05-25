import { PageContainer } from "@/components/shell/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <PageContainer>
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Platform settings boundary. Configuration workflows can be added here later.
        </CardContent>
      </Card>
    </PageContainer>
  );
}
