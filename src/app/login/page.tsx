import { login, signup, joinAsGuest } from './actions'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export default async function LoginPage(props: { searchParams: Promise<{ error?: string }> }) {
    const searchParams = await props.searchParams;
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-sm shadow-lg">
                <form>
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">Prijava</CardTitle>
                        <CardDescription>
                            Unesite svoju e-mail adresu za prijavu na račun
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">E-mail</Label>
                            <Input id="email" name="email" type="email" placeholder="vas@email.com" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Lozinka</Label>
                            <Input id="password" name="password" type="password" required />
                        </div>
                        {searchParams?.error && (
                            <div className="text-sm font-medium text-destructive">{searchParams.error}</div>
                        )}
                    </CardContent>
                    <CardFooter className="flex flex-col gap-3">
                        <Button className="w-full" formAction={login}>Prijavi se</Button>
                        <Button variant="outline" className="w-full" formAction={signup}>Registriraj se</Button>
                        <Separator className="my-2" />
                        <div className="text-center text-sm text-muted-foreground">
                            ili
                        </div>
                        <Button
                            variant="secondary"
                            className="w-full"
                            formAction={joinAsGuest}
                        >
                            Nastavi kao gost
                        </Button>
                        <p className="text-xs text-muted-foreground text-center">
                            Gost ima pristup svim funkcijama. Podaci se ne čuvaju.
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
