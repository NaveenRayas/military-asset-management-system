from django.core.management.base import BaseCommand
from database.seed_data import seed

class Command(BaseCommand):
    help = 'Seeds database with demo military bases, equipment types, users, and transactions.'

    def handle(self, *args, **options):
        self.stdout.write("Running seed script...")
        seed()
        self.stdout.write(self.style.SUCCESS("Successfully seeded database!"))
