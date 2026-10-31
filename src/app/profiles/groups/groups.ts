// groups.ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '@services/auth';
import { GroupStore } from '@state/group.store';
import { ProfileStore } from '@state/profile.store';

@Component({
  selector: 'app-groups',
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
  ],
  templateUrl: './groups.html',
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Groups {
  protected readonly groupStore = inject(GroupStore);
  private readonly profileStore = inject(ProfileStore);
  private readonly auth = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly currentUid = this.auth.uid;
  protected readonly groups = this.groupStore.groupsWithMembers;

  protected readonly newGroupName = signal('');
  protected readonly busy = signal(false);
  protected readonly confirmingDelete = signal(false);
  private readonly selectedId = signal<string | null>(null);

  /** The chosen group, falling back to the first one (e.g. after a delete or leave). */
  protected readonly selectedGroup = computed(() => {
    const groups = this.groups();
    return groups.find((g) => g.id === this.selectedId()) ?? groups[0] ?? null;
  });

  protected readonly isOwner = computed(
    () => !!this.currentUid() && this.selectedGroup()?.ownerId === this.currentUid(),
  );

  /** Users who aren't in the selected group yet. */
  protected readonly availableUsers = computed(() => {
    const group = this.selectedGroup();
    if (!group) return [];
    const memberIds = new Set(group.memberIds);
    return this.profileStore.users().filter((u) => !memberIds.has(u.uid));
  });

  protected readonly canCreate = computed(
    () => this.newGroupName().trim().length > 0 && !this.busy(),
  );

  protected select(groupId: string) {
    this.selectedId.set(groupId);
    this.confirmingDelete.set(false);
  }

  protected createGroup() {
    if (!this.canCreate()) return;

    void this.run(async () => {
      const id = await this.groupStore.createGroup(this.newGroupName());
      this.newGroupName.set('');
      this.select(id);
    });
  }

  protected addMember(groupId: string, userId: string) {
    void this.run(() => this.groupStore.addMember(groupId, userId));
  }

  protected removeMember(groupId: string, userId: string) {
    void this.run(() => this.groupStore.removeMember(groupId, userId));
  }

  protected leaveGroup(groupId: string) {
    const uid = this.currentUid();
    if (!uid) return;
    void this.run(() => this.groupStore.removeMember(groupId, uid));
  }

  protected deleteGroup(groupId: string) {
    void this.run(async () => {
      await this.groupStore.deleteGroup(groupId);
      this.confirmingDelete.set(false);
    });
  }

  /** Runs a store action, disabling the UI while it's in flight and surfacing errors. */
  private async run(action: () => Promise<unknown>) {
    this.busy.set(true);
    try {
      await action();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Something went wrong. Try again.';
      this.snackBar.open(message, 'Dismiss', { duration: 5000 });
    } finally {
      this.busy.set(false);
    }
  }
}
